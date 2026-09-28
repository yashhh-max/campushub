from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User, StudentProfile, FacultyProfile
from campus.models import (
    Department,
    Company,
    PlacementDrive,
    AuditLog,
    SystemSetting,
)


class InstitutionalSecurityQATestCase(TestCase):
    """
    Automated Security QA test suite for KPRIT CampusHub Phase 7.
    Verifies server-side authorization boundaries, role segregation,
    tamper resistance, password reset workflows, and audit logging.
    """

    def setUp(self):
        self.client = APIClient()

        # 1. Academic Departments
        self.dept_cse = Department.objects.create(
            name="Computer Science & Engineering",
            code="CSE",
            hod_name="Dr. K. S. Rao",
            contact_email="hod.cse@kpritech.ac.in",
            is_active=True
        )
        self.dept_ece = Department.objects.create(
            name="Electronics & Communication Engineering",
            code="ECE",
            hod_name="Dr. V. Lakshmi",
            contact_email="hod.ece@kpritech.ac.in",
            is_active=True
        )

        # 2. Institutional Role Personas
        self.student = User.objects.create_user(
            email="student.test@kpritech.ac.in",
            password="Password123!",
            role="student",
            full_name="Test Student"
        )
        self.student_profile = StudentProfile.objects.create(
            user=self.student,
            student_id="22K81A0599",
            department="CSE",
            graduation_year=2026,
            cgpa=Decimal("8.50"),
            backlogs=0
        )

        self.faculty = User.objects.create_user(
            email="faculty.test@kpritech.ac.in",
            password="Password123!",
            role="faculty",
            full_name="Prof. Test Faculty",
            is_staff=True
        )
        self.faculty_profile = FacultyProfile.objects.create(
            user=self.faculty,
            employee_id="KPRIT-CSE-050",
            department="CSE",
            designation="Assistant Professor"
        )

        self.dept_admin = User.objects.create_user(
            email="hod.cse.test@kpritech.ac.in",
            password="Password123!",
            role="department_admin",
            full_name="Dr. HOD CSE",
            is_staff=True
        )
        self.dept_admin_profile = FacultyProfile.objects.create(
            user=self.dept_admin,
            employee_id="KPRIT-CSE-001",
            department="CSE",
            designation="Professor & HOD",
            is_hod=True
        )

        self.tpo_admin = User.objects.create_user(
            email="tpo.test@kpritech.ac.in",
            password="Password123!",
            role="tpo_admin",
            full_name="TPO Head",
            is_staff=True
        )

        self.college_admin = User.objects.create_user(
            email="principal.test@kpritech.ac.in",
            password="Password123!",
            role="college_admin",
            full_name="Principal Dr. KPR",
            is_staff=True
        )

        self.super_admin = User.objects.create_superuser(
            email="superadmin.test@kpritech.ac.in",
            password="Password123!",
            role="super_admin",
            full_name="System IT Admin"
        )

        # 3. Recruiting Company
        self.company = Company.objects.create(
            name="Darwinbox Technologies",
            industry="Enterprise HR SaaS",
            tier="Super Dream",
            is_active=True
        )

    # ==========================================================================
    # 1. Unauthenticated Access Controls
    # ==========================================================================

    def test_unauthenticated_request_to_admin_users(self):
        """Unauthenticated requests to admin users must return 401 Unauthorized."""
        response = self.client.get('/api/auth/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_request_to_audit_logs(self):
        """Unauthenticated requests to audit logs must return 401 Unauthorized."""
        response = self.client.get('/api/audit-logs/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ==========================================================================
    # 2. Student Role Boundaries (Strict Rejection from Admin/TPO Modules)
    # ==========================================================================

    def test_student_forbidden_from_admin_users(self):
        """Students must receive 403 Forbidden when requesting user administration."""
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/auth/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_forbidden_from_audit_logs(self):
        """Students must receive 403 Forbidden when accessing audit logs."""
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/audit-logs/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_forbidden_from_system_settings(self):
        """Students must receive 403 Forbidden when accessing or modifying system settings."""
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/settings/system/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.post('/api/settings/system/', {'institution_name': 'Hacked State'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_forbidden_from_creating_placement_drives(self):
        """Students must receive 403 Forbidden when attempting to create corporate drives."""
        self.client.force_authenticate(user=self.student)
        payload = {
            "company_id": self.company.id,
            "title": "Unauthorized Drive",
            "job_role": "Hacker",
            "package_lpa": "25.00",
            "application_deadline": (timezone.now() + timezone.timedelta(days=7)).isoformat()
        }
        response = self.client.post('/api/placements/drives/', payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_elevate_role_via_me_patch(self):
        """Student attempting to patch role to super_admin or college_admin must be neutralized."""
        self.client.force_authenticate(user=self.student)
        response = self.client.patch('/api/auth/me/', {
            'role': 'super_admin',
            'is_staff': True,
            'is_superuser': True,
            'full_name': 'Legitimate Name Update'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Reload from database to verify server-side state
        self.student.refresh_from_db()
        self.assertEqual(self.student.role, 'student')
        self.assertFalse(self.student.is_staff)
        self.assertFalse(self.student.is_superuser)
        self.assertEqual(self.student.full_name, 'Legitimate Name Update')

    # ==========================================================================
    # 3. Faculty Role Boundaries
    # ==========================================================================

    def test_faculty_forbidden_from_system_settings(self):
        """Faculty cannot alter college system settings."""
        self.client.force_authenticate(user=self.faculty)
        response = self.client.post('/api/settings/system/', {'is_maintenance_mode': True})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_faculty_forbidden_from_creating_placement_drives(self):
        """Faculty cannot create placement drives (TPO domain)."""
        self.client.force_authenticate(user=self.faculty)
        response = self.client.post('/api/placements/drives/', {'company_id': self.company.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ==========================================================================
    # 4. TPO Admin Authorized Scope & Boundaries
    # ==========================================================================

    def test_tpo_can_manage_placement_drives(self):
        """TPO Admin is authorized to create corporate placement drives."""
        self.client.force_authenticate(user=self.tpo_admin)
        payload = {
            "company_id": self.company.id,
            "title": "Darwinbox Software Engineer 2026",
            "job_role": "Software Development Engineer",
            "package_lpa": "14.50",
            "application_deadline": (timezone.now() + timezone.timedelta(days=10)).isoformat(),
            "eligibility_min_cgpa": "7.50",
            "eligibility_max_backlogs": 0,
            "eligibility_departments": ["CSE", "CSM", "CSD"],
            "eligibility_graduation_year": 2026
        }
        response = self.client.post('/api/placements/drives/', payload, format='json')
        if response.status_code != 201:
            print("DRIVE CREATE ERROR:", response.data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], "Darwinbox Software Engineer 2026")

    def test_tpo_forbidden_from_system_settings(self):
        """TPO Admin cannot alter institutional system settings."""
        self.client.force_authenticate(user=self.tpo_admin)
        response = self.client.post('/api/settings/system/', {'academic_year': '2030-2031'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ==========================================================================
    # 5. College Admin & Super Admin Authorized Operations
    # ==========================================================================

    def test_college_admin_can_access_all_institutional_modules(self):
        """College Admin (Principal) has authorized access to institutional modules."""
        self.client.force_authenticate(user=self.college_admin)

        # Analytics
        res_analytics = self.client.get('/api/analytics/admin/')
        self.assertEqual(res_analytics.status_code, status.HTTP_200_OK)

        # Approvals
        res_approvals = self.client.get('/api/approvals/')
        self.assertEqual(res_approvals.status_code, status.HTTP_200_OK)

        # Audit logs
        res_audit = self.client.get('/api/audit-logs/')
        self.assertEqual(res_audit.status_code, status.HTTP_200_OK)

    # ==========================================================================
    # 6. Password Reset Security Workflows
    # ==========================================================================

    def test_password_reset_workflow_end_to_end(self):
        """Verifies institutional password reset request, signed token generation, and update."""
        # 1. Request Reset
        req_res = self.client.post('/api/auth/password-reset/', {'email': self.student.email})
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)
        self.assertIn("message", req_res.data)

        # 2. Generate signed token manually for deterministic check
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes

        token = default_token_generator.make_token(self.student)
        uidb64 = urlsafe_base64_encode(force_bytes(self.student.pk))

        # 3. Confirm Reset with valid new password
        confirm_res = self.client.post('/api/auth/password-reset/confirm/', {
            'uidb64': uidb64,
            'token': token,
            'new_password': 'BrandNewSecurePassword@2026'
        })
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        # 4. Verify user can authenticate with the new password
        login_res = self.client.post('/api/auth/login/', {
            'email': self.student.email,
            'password': 'BrandNewSecurePassword@2026'
        })
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)

    def test_password_reset_invalid_token_rejected(self):
        """Invalid or tampered tokens must be strictly rejected with 400."""
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes

        uidb64 = urlsafe_base64_encode(force_bytes(self.student.pk))
        confirm_res = self.client.post('/api/auth/password-reset/confirm/', {
            'uidb64': uidb64,
            'token': 'bogus-tampered-token',
            'new_password': 'SecurePassword@2026'
        })
        self.assertEqual(confirm_res.status_code, status.HTTP_400_BAD_REQUEST)
