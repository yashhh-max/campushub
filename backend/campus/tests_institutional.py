from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User, StudentProfile, FacultyProfile
from campus.models import (
    Department,
    Company,
    PlacementDrive,
    PlacementApplication,
    Opportunity,
    OpportunityApplication,
    ApprovalRequest,
    Club,
    Event,
    Announcement,
)


class InstitutionalRBACTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Seed Department
        self.dept_cse = Department.objects.create(
            name="Computer Science & Engineering",
            code="CSE",
            hod_name="Dr. Rao",
            contact_email="hod.cse@kpritech.ac.in",
            is_active=True
        )

        # 1. Super Admin
        self.superadmin = User.objects.create_user(
            email="superadmin@kpritech.ac.in",
            password="Password@123",
            full_name="Super Admin",
            role="super_admin",
            is_staff=True,
            is_superuser=True
        )

        # 2. College Admin
        self.college_admin = User.objects.create_user(
            email="principal@kpritech.ac.in",
            password="Password@123",
            full_name="Principal",
            role="college_admin",
            is_staff=True
        )

        # 3. TPO Admin
        self.tpo_admin = User.objects.create_user(
            email="tpo@kpritech.ac.in",
            password="Password@123",
            full_name="TPO Head",
            role="tpo_admin"
        )

        # 4. Department Admin (CSE)
        self.dept_admin = User.objects.create_user(
            email="hod.cse@kpritech.ac.in",
            password="Password@123",
            full_name="HOD CSE",
            role="department_admin"
        )
        FacultyProfile.objects.create(user=self.dept_admin, department="CSE", employee_id="EMP-101")

        # 5. Eligible Student (CGPA: 8.5, 0 backlogs, CSE, 2026 batch)
        self.student_eligible = User.objects.create_user(
            email="eligible.student@kpritech.ac.in",
            password="Password@123",
            full_name="Eligible Student",
            role="student"
        )
        StudentProfile.objects.create(
            user=self.student_eligible,
            student_id="22K81A0501",
            department="CSE",
            graduation_year=2026,
            cgpa=8.50,
            backlogs=0,
            is_placed=False
        )

        # 6. Ineligible Student (Low CGPA: 5.8, 2 backlogs, MECH, 2027 batch)
        self.student_ineligible = User.objects.create_user(
            email="ineligible.student@kpritech.ac.in",
            password="Password@123",
            full_name="Ineligible Student",
            role="student"
        )
        StudentProfile.objects.create(
            user=self.student_ineligible,
            student_id="23K81A0301",
            department="MECH",
            graduation_year=2027,
            cgpa=5.80,
            backlogs=2,
            is_placed=False
        )

        # Company & Placement Drive
        self.company = Company.objects.create(
            name="KPRIT Premier Tech",
            industry="Software",
            tier="Super Dream"
        )
        self.drive = PlacementDrive.objects.create(
            company=self.company,
            title="Software Engineer 2026",
            job_role="SDE",
            package_lpa=12.00,
            application_deadline=timezone.now() + timedelta(days=10),
            eligibility_min_cgpa=7.50,
            eligibility_max_backlogs=0,
            eligibility_departments=["CSE", "CSM"],
            eligibility_graduation_year=2026,
            status="active"
        )

    def test_student_cannot_access_audit_logs(self):
        self.client.force_authenticate(user=self.student_eligible)
        response = self.client.get('/api/audit-logs/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_college_admin_can_access_audit_logs(self):
        self.client.force_authenticate(user=self.college_admin)
        response = self.client.get('/api/audit-logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_tpo_admin_can_create_drive(self):
        self.client.force_authenticate(user=self.tpo_admin)
        response = self.client.post('/api/placements/drives/', {
            "company": self.company.id,
            "title": "Cloud Architect Drive",
            "job_role": "Cloud Engineer",
            "package_lpa": "8.50",
            "application_deadline": (timezone.now() + timedelta(days=5)).isoformat(),
            "eligibility_min_cgpa": "6.50",
            "eligibility_max_backlogs": 0,
            "eligibility_departments": ["CSE", "ECE"],
            "eligibility_graduation_year": 2026,
            "status": "active"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_placement_drive_database_eligibility_enforcement(self):
        # 1. Eligible student applies
        self.client.force_authenticate(user=self.student_eligible)
        res_check = self.client.get(f'/api/placements/drives/{self.drive.id}/eligibility/')
        self.assertEqual(res_check.status_code, status.HTTP_200_OK)
        self.assertTrue(res_check.data['is_eligible'])

        res_apply = self.client.post(f'/api/placements/drives/{self.drive.id}/apply/')
        self.assertEqual(res_apply.status_code, status.HTTP_201_CREATED)

        # 2. Ineligible student applies -> Server-side rejection with reasons
        self.client.force_authenticate(user=self.student_ineligible)
        res_ineligible_check = self.client.get(f'/api/placements/drives/{self.drive.id}/eligibility/')
        self.assertEqual(res_ineligible_check.status_code, status.HTTP_200_OK)
        self.assertFalse(res_ineligible_check.data['is_eligible'])
        self.assertGreater(len(res_ineligible_check.data['reasons']), 0)

        res_ineligible_apply = self.client.post(f'/api/placements/drives/{self.drive.id}/apply/')
        self.assertEqual(res_ineligible_apply.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("institutional eligibility criteria", res_ineligible_apply.data['error'])

    def test_unified_approval_workflow(self):
        # Propose an opportunity requiring approval
        opp = Opportunity.objects.create(
            title="KPRIT Hackathon 2026",
            organization="KPRIT Tech Cell",
            opportunity_type="hackathon",
            description="Institutional competition",
            deadline=timezone.now() + timedelta(days=20),
            status="pending_approval"
        )
        approval_req = ApprovalRequest.objects.create(
            item_type='opportunity',
            item_id=opp.id,
            title=opp.title,
            summary="New student hackathon proposal",
            requested_by=self.student_eligible,
            status="pending"
        )

        # College admin reviews and approves
        self.client.force_authenticate(user=self.college_admin)
        res_approve = self.client.post(f'/api/approvals/{approval_req.id}/action/', {
            "action": "approve",
            "notes": "Approved for campus participation."
        }, format='json')

        self.assertEqual(res_approve.status_code, status.HTTP_200_OK)
        opp.refresh_from_db()
        self.assertEqual(opp.status, 'approved')

    def test_database_driven_analytics(self):
        self.client.force_authenticate(user=self.college_admin)
        res = self.client.get('/api/analytics/admin/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        metrics = res.data['metrics']
        self.assertIn('total_students', metrics)
        self.assertIn('total_faculty', metrics)
        self.assertIn('total_drives', metrics)
        self.assertIn('attendance_rate_pct', metrics)
        self.assertGreaterEqual(metrics['total_students'], 2)
