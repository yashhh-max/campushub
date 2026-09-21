from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.conf import settings
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, StudentProfile


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = [
            'student_id',
            'department',
            'graduation_year',
            'bio',
            'created_at',
            'updated_at',
        ]


class UserSerializer(serializers.ModelSerializer):
    profile = StudentProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'role',
            'is_staff',
            'date_joined',
            'profile',
        ]


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    student_id = serializers.CharField(max_length=32, required=False, allow_blank=True)
    department = serializers.CharField(max_length=100, required=False, allow_blank=True)
    graduation_year = serializers.IntegerField(required=False, allow_null=True)

    def validate_email(self, value):
        normalized = value.strip().lower()

        # Check unique constraint
        if User.objects.filter(email=normalized).exists():
            raise serializers.ValidationError("An account with this email address already exists.")

        # Configurable student email domain check
        allowed_domains = getattr(settings, 'ALLOWED_STUDENT_EMAIL_DOMAINS', [])
        if allowed_domains:
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

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")

        attrs['user'] = user
        return attrs
