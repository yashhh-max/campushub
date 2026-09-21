from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from campus.models import (
    Club, Event, EventRSVP, ClubMembership, Announcement, Notification, EventTicket
)

User = get_user_model()


class CampusHubSecurityTestSuite(TestCase):
    """
    Automated security verification suite for CampusHub Phase 7.
    Tests authorization boundaries, RBAC isolation, ticket cryptography, and injection defenses.
    """

    def setUp(self):
        self.client = APIClient()
        now = timezone.now()

        # Users
        self.admin = User.objects.create_user(
            email="sec.admin@campushub.edu",
            password="AdminPass123!",
            role="admin",
            full_name="Security Admin",
            is_staff=True
        )
        self.leader = User.objects.create_user(
            email="sec.leader@campushub.edu",
            password="LeaderPass123!",
            role="club_leader",
            full_name="Security Leader"
        )
        self.student = User.objects.create_user(
            email="sec.student@campushub.edu",
            password="StudentPass123!",
            role="student",
            full_name="Security Student"
        )
        self.attacker = User.objects.create_user(
            email="sec.attacker@campushub.edu",
            password="AttackerPass123!",
            role="student",
            full_name="Security Attacker"
        )

        # Club
        self.club = Club.objects.create(
            name="Cybersecurity & Cryptography Club",
            slug="cybersec-crypto-club",
            category="Technology",
            leader=self.leader,
            is_approved=True
        )
        ClubMembership.objects.create(
            club=self.club,
            user=self.leader,
            role="president",
            status="approved"
        )
        ClubMembership.objects.create(
            club=self.club,
            user=self.student,
            role="member",
            status="approved"
        )

        # Event
        self.event = Event.objects.create(
            club=self.club,
            title="Zero Trust Security Summit 2026",
            category="Tech",
            description="Autonomous defenses and privilege escalation testing.",
            location="Cyber Range Auditorium",
            start_time=now + timedelta(days=3),
            end_time=now + timedelta(days=3, hours=4),
            capacity=50,
            is_published=True,
            created_by=self.leader
        )

        # Other Event for cross-event ticket testing
        self.other_event = Event.objects.create(
            club=self.club,
            title="Independent Colloquium",
            category="Academic",
            description="Different event entirely.",
            location="Room 101",
            start_time=now + timedelta(days=5),
            end_time=now + timedelta(days=5, hours=2),
            capacity=30,
            is_published=True,
            created_by=self.leader
        )

        # Student RSVP and Ticket
        self.rsvp = EventRSVP.objects.create(
            event=self.event,
            user=self.student,
            status="attending"
        )
        self.ticket = EventTicket.objects.create(
            event=self.event,
            attendee=self.student,
            rsvp=self.rsvp,
            ticket_code="CH-SEC-VALID123",
            qr_payload="CH-SEC-PAYLOAD123",
            status="valid"
        )

        # Other event ticket
        self.other_rsvp = EventRSVP.objects.create(
            event=self.other_event,
            user=self.attacker,
            status="attending"
        )
        self.other_ticket = EventTicket.objects.create(
            event=self.other_event,
            attendee=self.attacker,
            rsvp=self.other_rsvp,
            ticket_code="CH-SEC-OTHER456",
            qr_payload="CH-SEC-OTHER456",
            status="valid"
        )

    # --------------------------------------------------------------------------
    # 1. Student Accessing Admin Endpoint
    # --------------------------------------------------------------------------
    def test_01_student_denied_from_admin_announcements_endpoint(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.post("/api/announcements/", {
            "title": "Unauthorized Announcement",
            "content": "Malicious campus notice injection attempt",
            "priority": "urgent",
            "target_audience": "everyone"
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # --------------------------------------------------------------------------
    # 2. Student Modifying Another User's Profile / Data
    # --------------------------------------------------------------------------
    def test_02_student_cannot_modify_other_user_data(self):
        self.client.force_authenticate(user=self.attacker)
        # Attempt to modify the leader's club role
        membership = ClubMembership.objects.get(club=self.club, user=self.student)
        res = self.client.post(f"/api/clubs/{self.club.slug}/membership/{membership.id}/reject/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # --------------------------------------------------------------------------
    # 3. User Accessing Another User's Notifications
    # --------------------------------------------------------------------------
    def test_03_user_cannot_access_other_users_notifications(self):
        notif = Notification.objects.create(
            recipient=self.student,
            notification_type="system",
            title="Private Confidential Security Alert",
            message="Secret token details"
        )
        # Attacker tries to read student's notification
        self.client.force_authenticate(user=self.attacker)
        res = self.client.post(f"/api/notifications/{notif.id}/read/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Attacker lists notifications - should NOT see student's notification
        list_res = self.client.get("/api/notifications/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        ids = [n["id"] for n in list_res.data.get("results", [])]
        self.assertNotIn(notif.id, ids)

    # --------------------------------------------------------------------------
    # 4. Non-Member Accessing Private Club Chat History
    # --------------------------------------------------------------------------
    def test_04_non_member_cannot_access_club_chat(self):
        self.client.force_authenticate(user=self.attacker)
        res = self.client.get(f"/api/clubs/{self.club.slug}/messages/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("must be an approved member", res.data.get("detail", "").lower())

    # --------------------------------------------------------------------------
    # 5. Unauthorized Event Editing
    # --------------------------------------------------------------------------
    def test_05_unauthorized_user_cannot_edit_or_delete_event(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.patch(f"/api/events/{self.event.id}/", {"title": "Defaced Event Title"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # --------------------------------------------------------------------------
    # 6. Unauthorized Attendee Roster & Export Access
    # --------------------------------------------------------------------------
    def test_06_unauthorized_user_cannot_view_or_export_attendance(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.get(f"/api/events/{self.event.id}/attendance/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        export_res = self.client.get(f"/api/events/{self.event.id}/attendance/export/")
        self.assertEqual(export_res.status_code, status.HTTP_403_FORBIDDEN)

    # --------------------------------------------------------------------------
    # 7. Forged / Fabricated Ticket Code
    # --------------------------------------------------------------------------
    def test_07_forged_ticket_code_rejected(self):
        self.client.force_authenticate(user=self.leader)
        res = self.client.post(f"/api/events/{self.event.id}/check-in/", {
            "ticket_code": "CH-FORGED-FAKE-9999"
        })
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.data.get("error_code"), "INVALID_TICKET")

    # --------------------------------------------------------------------------
    # 8. Reused / Duplicate Ticket Check-In
    # --------------------------------------------------------------------------
    def test_08_reused_ticket_checkin_flagged_as_duplicate(self):
        self.client.force_authenticate(user=self.leader)
        # First scan -> 200 OK
        first_scan = self.client.post(f"/api/events/{self.event.id}/check-in/", {
            "ticket_code": self.ticket.ticket_code
        })
        self.assertEqual(first_scan.status_code, status.HTTP_200_OK)
        self.assertFalse(first_scan.data.get("duplicate", False))

        # Second scan -> Duplicate alert
        second_scan = self.client.post(f"/api/events/{self.event.id}/check-in/", {
            "ticket_code": self.ticket.ticket_code
        })
        self.assertEqual(second_scan.status_code, status.HTTP_200_OK)
        self.assertTrue(second_scan.data.get("duplicate"))
        self.assertEqual(second_scan.data.get("error_code"), "ALREADY_CHECKED_IN")

    # --------------------------------------------------------------------------
    # 9. Ticket from Another Event Attempted Check-In
    # --------------------------------------------------------------------------
    def test_09_ticket_from_different_event_rejected(self):
        self.client.force_authenticate(user=self.leader)
        res = self.client.post(f"/api/events/{self.event.id}/check-in/", {
            "ticket_code": self.other_ticket.ticket_code
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data.get("error_code"), "WRONG_EVENT")

    # --------------------------------------------------------------------------
    # 10. Student Attempting Organizer Manual Check-In
    # --------------------------------------------------------------------------
    def test_10_student_cannot_manually_override_attendance(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f"/api/events/{self.event.id}/attendance/manual/", {
            "attendee_id": self.student.id,
            "checked_in": True
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # --------------------------------------------------------------------------
    # 11. Invalid / Tampered JWT Authentication
    # --------------------------------------------------------------------------
    def test_11_invalid_jwt_rejected(self):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION="Bearer invalid.tampered.jwt.signature")
        res = client.get("/api/auth/me/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    # --------------------------------------------------------------------------
    # 12. Expired / Malformed Authorization Header
    # --------------------------------------------------------------------------
    def test_12_malformed_auth_header_rejected(self):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION="Basic not_a_bearer_token")
        res = client.get("/api/auth/me/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


    # --------------------------------------------------------------------------
    # 13. Malformed / Invalid Input Payloads
    # --------------------------------------------------------------------------
    def test_13_invalid_input_payload_rejected(self):
        self.client.force_authenticate(user=self.student)
        # Empty question content
        res = self.client.post(f"/api/events/{self.event.id}/questions/", {
            "content": "   "
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
