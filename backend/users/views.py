from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.db.models import Q
from django.core.paginator import Paginator
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from .models import User, StudentProfile, FacultyProfile
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    AdminUserCreateSerializer,
    AdminUserUpdateSerializer,
    FacultyProfileSerializer,
    StudentProfileSerializer,
)
from .permissions import (
    get_user_permissions,
    has_permission,
    IsInstitutionalAdmin,
    USER_VIEW,
    USER_EDIT,
    USER_DISABLE,
)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh['email'] = user.email
    refresh['role'] = user.role
    refresh['full_name'] = user.full_name

    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterView(APIView):
    """
    Public student registration endpoint.
    Validates email format, domain restriction, password rules,
    and returns initial JWT access and refresh tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            return Response(
                {
                    "message": "Registration successful.",
                    "user": UserSerializer(user).data,
                    "tokens": tokens,
                },
                status=status.HTTP_201_CREATED
            )
        return Response(
            {
                "message": "Registration failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST
        )


class LoginView(APIView):
    """
    Public login endpoint. Authenticates user with email and password,
    returning a pair of JWT access and refresh tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            tokens = get_tokens_for_user(user)
            return Response(
                {
                    "message": "Login successful.",
                    "user": UserSerializer(user).data,
                    "tokens": tokens,
                },
                status=status.HTTP_200_OK
            )
        return Response(
            {
                "message": "Authentication failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST
        )


class LogoutView(APIView):
    """
    Logout endpoint that invalidates/blacklists the active refresh token.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required to invalidate the session."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"message": "Logged out successfully. Token invalidated."},
                status=status.HTTP_200_OK
            )
        except TokenError as exc:
            return Response(
                {"error": f"Invalid token or token already blacklisted: {str(exc)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


class MeView(APIView):
    """
    Returns the authenticated user's profile and permissions.
    Supports updating profile attributes (bio, resume_url, full_name)
    while strictly disallowing privilege/role escalation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        data = request.data

        # Explicitly ignore any attempt to alter role or administrative flags
        if 'full_name' in data and data['full_name']:
            user.full_name = data['full_name'].strip()
            user.save(update_fields=['full_name', 'updated_at'])

        if hasattr(user, 'profile') and user.profile:
            profile = user.profile
            if 'bio' in data:
                profile.bio = str(data['bio']).strip()
            if 'resume_url' in data:
                profile.resume_url = str(data['resume_url']).strip()
            profile.save()

        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


# ==============================================================================
# Institutional Admin User Management Endpoints
# ==============================================================================

class AdminUserListView(APIView):
    """
    List and create users for KPRIT institutional management.
    Requires USER_VIEW permission for GET, and USER_EDIT for POST.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstitutionalAdmin]

    def get(self, request):
        if not has_permission(request.user, USER_VIEW):
            return Response({"error": "Permission denied: USER_VIEW required."}, status=status.HTTP_403_FORBIDDEN)

        qs = User.objects.all().select_related('profile', 'faculty_profile')

        # Role filter
        role = request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)

        # Active status filter
        is_active = request.query_params.get('is_active')
        if is_active is not None and is_active != '':
            qs = qs.filter(is_active=is_active.lower() in ('true', '1'))

        # Department filter (checks both student and faculty profile)
        department = request.query_params.get('department')
        if department:
            qs = qs.filter(
                Q(profile__department__iexact=department) |
                Q(faculty_profile__department__iexact=department)
            )

        # Search term across name, email, roll number, employee id
        search = request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(profile__student_id__icontains=search) |
                Q(faculty_profile__employee_id__icontains=search)
            )

        # Ordering
        ordering = request.query_params.get('ordering', '-date_joined')
        if ordering in ('date_joined', '-date_joined', 'full_name', '-full_name', 'email', '-email'):
            qs = qs.order_by(ordering)

        # Pagination
        page_num = request.query_params.get('page', 1)
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        paginator = Paginator(qs, page_size)
        page = paginator.get_page(page_num)

        serializer = UserSerializer(page.object_list, many=True)
        return Response({
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': page.number,
            'page_size': page_size,
            'results': serializer.data,
        }, status=status.HTTP_200_OK)

    def post(self, request):
        if not has_permission(request.user, USER_EDIT):
            return Response({"error": "Permission denied: USER_EDIT required."}, status=status.HTTP_403_FORBIDDEN)

        serializer = AdminUserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class AdminUserDetailView(APIView):
    """
    Retrieve, update, or disable individual user accounts.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstitutionalAdmin]

    def get_object(self, pk):
        try:
            return User.objects.select_related('profile', 'faculty_profile').get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        if not has_permission(request.user, USER_VIEW):
            return Response({"error": "Permission denied: USER_VIEW required."}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object(pk)
        if not user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        if not has_permission(request.user, USER_EDIT):
            return Response({"error": "Permission denied: USER_EDIT required."}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object(pk)
        if not user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminUserUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            updated_user = serializer.save()
            return Response(UserSerializer(updated_user).data, status=status.HTTP_200_OK)
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Disables the user rather than permanently deleting database records."""
        if not has_permission(request.user, USER_DISABLE):
            return Response({"error": "Permission denied: USER_DISABLE required."}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object(pk)
        if not user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        if user == request.user:
            return Response({"error": "You cannot deactivate your own account."}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = False
        user.save()
        return Response({"message": f"User {user.email} deactivated successfully."}, status=status.HTTP_200_OK)


class AdminUserToggleActiveView(APIView):
    """
    Quickly toggle a user's active/deactivated status.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstitutionalAdmin]

    def post(self, request, pk):
        if not has_permission(request.user, USER_DISABLE):
            return Response({"error": "Permission denied: USER_DISABLE required."}, status=status.HTTP_403_FORBIDDEN)
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if user == request.user:
            return Response({"error": "You cannot deactivate your own account."}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = not user.is_active
        user.save()
        return Response({
            "message": f"User {user.email} is now {'active' if user.is_active else 'deactivated'}.",
            "is_active": user.is_active
        }, status=status.HTTP_200_OK)


class AdminStudentListView(APIView):
    """
    Specialized query for student management with academic records.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstitutionalAdmin]

    def get(self, request):
        if not has_permission(request.user, USER_VIEW):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        qs = User.objects.filter(role='student').select_related('profile').order_by('profile__student_id', 'full_name')

        department = request.query_params.get('department')
        if department:
            qs = qs.filter(profile__department__iexact=department)

        year = request.query_params.get('graduation_year')
        if year:
            qs = qs.filter(profile__graduation_year=year)

        search = request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(profile__student_id__icontains=search)
            )

        page_num = request.query_params.get('page', 1)
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        paginator = Paginator(qs, page_size)
        page = paginator.get_page(page_num)

        return Response({
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': page.number,
            'page_size': page_size,
            'results': UserSerializer(page.object_list, many=True).data,
        }, status=status.HTTP_200_OK)


class AdminFacultyListView(APIView):
    """
    Specialized query for faculty directory and institutional management.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstitutionalAdmin]

    def get(self, request):
        if not has_permission(request.user, USER_VIEW):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        qs = User.objects.filter(role__in=['faculty', 'department_admin']).select_related('faculty_profile').order_by('full_name')

        department = request.query_params.get('department')
        if department:
            qs = qs.filter(faculty_profile__department__iexact=department)

        search = request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(faculty_profile__employee_id__icontains=search) |
                Q(faculty_profile__designation__icontains=search)
            )

        page_num = request.query_params.get('page', 1)
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        paginator = Paginator(qs, page_size)
        page = paginator.get_page(page_num)

        return Response({
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': page.number,
            'page_size': page_size,
            'results': UserSerializer(page.object_list, many=True).data,
        }, status=status.HTTP_200_OK)


# ==============================================================================
# Institutional Password Reset Workflows
# ==============================================================================

class PasswordResetRequestView(APIView):
    """
    Public endpoint to initiate institutional password reset.
    Dispatches a signed one-time token to the user's institutional email address.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({"error": "Email address is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email=email, is_active=True).first()
        if user:
            token = default_token_generator.make_token(user)
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            reset_url = f"{request.scheme}://{request.get_host()}/reset-password?uid={uidb64}&token={token}"

            subject = "KPRIT CampusHub — Institutional Password Reset Request"
            message = (
                f"Hello {user.full_name or user.email},\n\n"
                f"A password reset request was received for your KPRIT CampusHub account.\n"
                f"To reset your credentials, use the following secure link:\n\n"
                f"{reset_url}\n\n"
                f"Token: {token}\n"
                f"UID: {uidb64}\n\n"
                f"If you did not request this change, please notify KPRIT IT Services immediately.\n\n"
                f"Kommuri Pratap Reddy Institute of Technology (KPRIT)\n"
                f"CampusHub Security Systems"
            )

            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
            except Exception as e:
                import logging
                logging.getLogger('django').error(f"Failed to send password reset email to {user.email}: {e}")

        # Always return 200 OK with neutral message to prevent account enumeration
        return Response(
            {"message": "If an active institutional account exists for this email, password reset instructions have been dispatched."},
            status=status.HTTP_200_OK
        )


class PasswordResetConfirmView(APIView):
    """
    Public endpoint to complete password reset using uidb64 and signed token.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uidb64')
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        if not uidb64 or not token or not new_password:
            return Response(
                {"error": "uidb64, token, and new_password are required fields."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"error": "Invalid or expired password reset link."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"error": "Invalid or expired password reset token."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(new_password, user=user)
        except Exception as exc:
            return Response(
                {"error": "Password validation failed.", "details": list(exc.messages) if hasattr(exc, 'messages') else [str(exc)]},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save(update_fields=['password', 'updated_at'])

        try:
            from campus.models import AuditLog
            AuditLog.objects.create(
                actor=user,
                action='PASSWORD_RESET',
                resource_type='User',
                resource_id=str(user.id),
                details={"status": "success", "mechanism": "institutional_email_token"}
            )
        except Exception:
            pass

        return Response(
            {"message": "Password has been successfully updated. You may now sign in with your new credentials."},
            status=status.HTTP_200_OK
        )
