from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, StudentProfile


class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('auth-register')
        self.login_url = reverse('auth-login')
        self.logout_url = reverse('auth-logout')
        self.me_url = reverse('auth-me')
        self.refresh_url = reverse('auth-token-refresh')

        self.user_data = {
            "email": "alex.student@state.edu",
            "password": "StrongPassword123!",
            "full_name": "Alex Student",
            "student_id": "STU-9921",
            "department": "Computer Science",
            "graduation_year": 2027,
        }

    def test_student_registration_success(self):
        """Verify successful student registration with profile and tokens."""
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("tokens", response.data)
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])
        self.assertEqual(response.data["user"]["email"], "alex.student@state.edu")
        self.assertEqual(response.data["user"]["role"], "student")

        # Verify DB records
        user = User.objects.get(email="alex.student@state.edu")
        self.assertEqual(user.full_name, "Alex Student")
        self.assertTrue(hasattr(user, 'profile'))
        self.assertEqual(user.profile.student_id, "STU-9921")
        self.assertEqual(user.profile.department, "Computer Science")

    def test_registration_duplicate_email(self):
        """Verify duplicate email registration is rejected with a clear error."""
        self.client.post(self.register_url, self.user_data, format='json')
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data["errors"])

    def test_registration_weak_password(self):
        """Verify weak/short passwords fail validation."""
        weak_data = dict(self.user_data)
        weak_data["email"] = "other@state.edu"
        weak_data["password"] = "short"
        response = self.client.post(self.register_url, weak_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data["errors"])

    @override_settings(ALLOWED_STUDENT_EMAIL_DOMAINS=['state.edu', 'campus.org'])
    def test_registration_configurable_email_domain(self):
        """Verify domain validation when restricted to specific university domains."""
        # Unauthorized domain
        invalid_data = dict(self.user_data)
        invalid_data["email"] = "student@gmail.com"
        response = self.client.post(self.register_url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data["errors"])

        # Authorized domain
        valid_data = dict(self.user_data)
        valid_data["email"] = "student@campus.org"
        response = self.client.post(self.register_url, valid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_login_success_and_token_generation(self):
        """Verify valid credentials return JWT tokens."""
        User.objects.create_user(
            email="test@state.edu",
            password="Password123!",
            full_name="Test User"
        )
        response = self.client.post(
            self.login_url,
            {"email": "test@state.edu", "password": "Password123!"},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", response.data)
        self.assertIn("access", response.data["tokens"])

    def test_login_invalid_password(self):
        """Verify invalid credentials return 400."""
        User.objects.create_user(
            email="test@state.edu",
            password="Password123!",
            full_name="Test User"
        )
        response = self.client.post(
            self.login_url,
            {"email": "test@state.edu", "password": "WrongPassword"},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_endpoint_requires_auth(self):
        """Verify /api/auth/me/ requires valid Bearer token."""
        # Without token
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # With token
        user = User.objects.create_user(
            email="auth@state.edu",
            password="Password123!",
            full_name="Authenticated User"
        )
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "auth@state.edu")

    def test_logout_and_token_blacklisting(self):
        """Verify refresh token is blacklisted upon logout and cannot be reused."""
        user = User.objects.create_user(
            email="logout@state.edu",
            password="Password123!",
            full_name="Logout User"
        )
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Call logout with Bearer auth and refresh token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_resp = self.client.post(self.logout_url, {"refresh": refresh_token}, format='json')
        self.assertEqual(logout_resp.status_code, status.HTTP_200_OK)

        # Attempt to refresh with blacklisted token should fail
        refresh_resp = self.client.post(self.refresh_url, {"refresh": refresh_token}, format='json')
        self.assertEqual(refresh_resp.status_code, status.HTTP_401_UNAUTHORIZED)
