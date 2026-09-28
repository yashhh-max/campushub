from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.conf import settings
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, StudentProfile, FacultyProfile
from .permissions import get_user_permissions


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = [
            'student_id',
            'department',
            'graduation_year',
            'section',
            'cgpa',
            'backlogs',
            'is_placed',
            'resume_url',
            'bio',
            'created_at',
            'updated_at',
        ]


class FacultyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacultyProfile
        fields = [
            'employee_id',
            'department',
            'designation',
            'specialization',
            'cabin_location',
            'contact_phone',
            'is_hod',
            'created_at',
            'updated_at',
        ]


class UserSerializer(serializers.ModelSerializer):
    profile = StudentProfileSerializer(read_only=True)
    faculty_profile = FacultyProfileSerializer(read_only=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'role',
            'is_staff',
            'is_superuser',
            'is_active',
            'date_joined',
            'profile',
            'faculty_profile',
            'permissions',
        ]

    def get_permissions(self, obj):
        return get_user_permissions(obj)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    student_id = serializers.CharField(max_length=32, required=False, allow_blank=True)
    department = serializers.CharField(max_length=100, required=False, allow_blank=True)
    graduation_year = serializers.IntegerField(required=False, allow_null=True)
    section = serializers.CharField(max_length=10, required=False, allow_blank=True)

    def validate_email(self, value):
        normalized = value.strip().lower()

        # Check unique constraint
        if User.objects.filter(email=normalized).exists():
            raise serializers.ValidationError("An account with this email address already exists.")

        # Configurable student email domain check
        allowed_domains = getattr(settings, 'ALLOWED_STUDENT_EMAIL_DOMAINS', [])
        if allowed_domains and '*' not in allowed_domains:
            parts = normalized.split('@')
            if len(parts) != 2:
                raise serializers.ValidationError("Invalid email address format.")
            domain = parts[1]
            if domain not in allowed_domains:
                allowed_str = ", ".join(allowed_domains)
                raise serializers.ValidationError(
                    f"Registration requires an authorized campus email domain (allowed: {allowed_str})."
                )

        return normalized

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        email = validated_data['email']
        full_name = validated_data['full_name']
        password = validated_data['password']

        user = User.objects.create_user(
            email=email,
            password=password,
            full_name=full_name,
            role='student'
        )

        StudentProfile.objects.create(
            user=user,
            student_id=validated_data.get('student_id', ''),
            department=validated_data.get('department', ''),
            graduation_year=validated_data.get('graduation_year', None),
            section=validated_data.get('section', ''),
        )

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password', '')

        if not email or not password:
            raise serializers.ValidationError("Both email and password are required.")

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")

        attrs['user'] = user
        return attrs


class AdminUserCreateSerializer(serializers.Serializer):
    """
    Used by College Admins and Super Admins to provision institutional faculty and staff accounts.
    """
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES)
    employee_id = serializers.CharField(max_length=32, required=False, allow_blank=True)
    department = serializers.CharField(max_length=100, required=False, allow_blank=True)
    designation = serializers.CharField(max_length=100, required=False, allow_blank=True)
    specialization = serializers.CharField(max_length=200, required=False, allow_blank=True)
    student_id = serializers.CharField(max_length=32, required=False, allow_blank=True)
    graduation_year = serializers.IntegerField(required=False, allow_null=True)

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email=normalized).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return normalized

    def create(self, validated_data):
        email = validated_data['email']
        full_name = validated_data['full_name']
        password = validated_data['password']
        role = validated_data['role']

        user = User.objects.create_user(
            email=email,
            password=password,
            full_name=full_name,
            role=role,
            is_staff=role in ('college_admin', 'super_admin', 'admin')
        )

        if role in ('faculty', 'department_admin', 'tpo_admin'):
            FacultyProfile.objects.create(
                user=user,
                employee_id=validated_data.get('employee_id', ''),
                department=validated_data.get('department', ''),
                designation=validated_data.get('designation', 'Assistant Professor'),
                specialization=validated_data.get('specialization', '')
            )
        elif role == 'student':
            StudentProfile.objects.create(
                user=user,
                student_id=validated_data.get('student_id', ''),
                department=validated_data.get('department', ''),
                graduation_year=validated_data.get('graduation_year', None)
            )

        return user


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """
    Used by Administrators to update user details, role, or active status.
    """
    student_profile = StudentProfileSerializer(source='profile', required=False)
    faculty_profile = FacultyProfileSerializer(required=False)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'role',
            'is_active',
            'student_profile',
            'faculty_profile',
        ]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        faculty_data = validated_data.pop('faculty_profile', None)

        instance.full_name = validated_data.get('full_name', instance.full_name)
        new_role = validated_data.get('role', instance.role)
        instance.role = new_role
        if 'is_active' in validated_data:
            instance.is_active = validated_data['is_active']
        instance.save()

        # Update student profile if provided
        if profile_data and hasattr(instance, 'profile'):
            for key, val in profile_data.items():
                setattr(instance.profile, key, val)
            instance.profile.save()

        # Update faculty profile if provided
        if faculty_data and hasattr(instance, 'faculty_profile'):
            for key, val in faculty_data.items():
                setattr(instance.faculty_profile, key, val)
            instance.faculty_profile.save()

        return instance
