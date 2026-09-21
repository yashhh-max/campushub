from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    # Add custom claims if helpful
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
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
