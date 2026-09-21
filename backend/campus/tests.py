from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.db import IntegrityError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from users.models import User, StudentProfile
from .models import (
    Club,
    Event,
    EventRSVP,
    Announcement,
    ClubMembership,
    ClubPost,
    Notification,
    NotificationPreference,
    ClubMessage,
    EventQuestion,
    EventAnswer,
    EventQuestionUpvote,
    EventTicket,
)
from django.core.management import call_command
from rest_framework_simplejwt.tokens import RefreshToken
from channels.testing import WebsocketCommunicator
from campushub.asgi import application




class CampusEventAndRSVPTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.now = timezone.now()

        # Users
        self.student = User.objects.create_user(
            email="student1@state.edu",
            password="Password123!",
            full_name="Alice Student",
            role="student"
        )
        self.other_student = User.objects.create_user(
            email="student2@state.edu",
            password="Password123!",
            full_name="Bob Student",
            role="student"
        )
        self.leader = User.objects.create_user(
            email="leader@state.edu",
            password="Password123!",
            full_name="Club President",
            role="club_leader"
        )
        self.admin = User.objects.create_user(
            email="admin@state.edu",
            password="Password123!",
            full_name="Admin User",
            role="admin",
            is_staff=True
        )

        # Club
        self.club = Club.objects.create(
            name="Robotics Society",
            slug="robotics-society",
            category="STEM",
            description="Autonomous drones and robotics.",
            leader=self.leader,
            meeting_schedule="Fridays @ 5 PM"
        )

        # Upcoming Event
        self.event = Event.objects.create(
            club=self.club,
            title="Intro to ROS2 & Drones",
            category="Tech",
            description="Hands-on robotics workshop.",
            location="Engineering Hall 204",
            start_time=self.now + timedelta(days=3),
            end_time=self.now + timedelta(days=3, hours=2),
            capacity=2,
            is_published=True,
            created_by=self.leader
        )

        # Draft Event
        self.draft_event = Event.objects.create(
            club=self.club,
            title="Unpublished Internal Planning",
            category="Tech",
            description="Draft only.",
            location="Room 101",
            start_time=self.now + timedelta(days=7),
            end_time=self.now + timedelta(days=7, hours=1),
            capacity=10,
            is_published=False,
            created_by=self.leader
        )

        # Past Event
        self.past_event = Event.objects.create(
            club=self.club,
            title="Spring Hackathon 2025",
            category="Tech",
            description="Past event from last semester.",
            location="Campus Atrium",
            start_time=self.now - timedelta(days=10),
            end_time=self.now - timedelta(days=9),
            capacity=100,
            is_published=True,
            created_by=self.leader
        )

    # 1. Event Creation & Permissions
    def test_student_cannot_create_event(self):
        """Verify normal student cannot create events."""
        self.client.force_authenticate(user=self.student)
        payload = {
            "club": self.club.id,
            "title": "Unauthorized Student Event",
            "category": "Social",
            "description": "Student party",
            "location": "Quad",
            "start_time": (self.now + timedelta(days=4)).isoformat(),
            "end_time": (self.now + timedelta(days=4, hours=2)).isoformat(),
            "capacity": 50,
        }
        response = self.client.post(reverse('event-list'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_club_leader_can_create_event(self):
        """Verify authorized club leader can create event for their club."""
        self.client.force_authenticate(user=self.leader)
        payload = {
            "club": self.club.id,
            "title": "New Drone Workshop",
            "category": "Tech",
            "description": "Authorized event description.",
            "location": "Makerspace",
            "start_time": (self.now + timedelta(days=5)).isoformat(),
            "end_time": (self.now + timedelta(days=5, hours=3)).isoformat(),
            "capacity": 35,
            "is_published": True,
        }
        response = self.client.post(reverse('event-list'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "New Drone Workshop")
        self.assertEqual(response.data["available_seats"], 35)

    def test_event_validation_rules(self):
        """Verify capacity must be positive and end_time must be after start_time."""
        self.client.force_authenticate(user=self.leader)

        # Capacity < 1
        bad_capacity = {
            "club": self.club.id,
            "title": "Zero Capacity Event",
            "category": "Tech",
            "description": "Testing validation",
            "location": "Room 1",
            "start_time": (self.now + timedelta(days=2)).isoformat(),
            "end_time": (self.now + timedelta(days=2, hours=1)).isoformat(),
            "capacity": 0,
        }
        resp1 = self.client.post(reverse('event-list'), bad_capacity, format='json')
        self.assertEqual(resp1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("capacity", resp1.data)

        # End time before start time
        bad_time = {
            "club": self.club.id,
            "title": "Time Traveler Event",
            "category": "Tech",
            "description": "Testing validation",
            "location": "Room 1",
            "start_time": (self.now + timedelta(days=2, hours=5)).isoformat(),
            "end_time": (self.now + timedelta(days=2, hours=2)).isoformat(),
            "capacity": 20,
        }
        resp2 = self.client.post(reverse('event-list'), bad_time, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("end_time", resp2.data)

    # 2. Event Discovery, Search, and Filtering
    def test_event_discovery_filters(self):
        """Verify category, search, and upcoming filters."""
        # Anonymous users only see published events
        resp = self.client.get(reverse('event-list'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        titles = [e["title"] for e in resp.data["results"]]
        self.assertIn("Intro to ROS2 & Drones", titles)
        self.assertNotIn("Unpublished Internal Planning", titles)

        # Category filter
        resp_cat = self.client.get(f"{reverse('event-list')}?category=Tech")
        self.assertEqual(resp_cat.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(resp_cat.data["count"], 1)

        # Search filter
        resp_search = self.client.get(f"{reverse('event-list')}?search=ROS2")
        self.assertEqual(resp_search.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_search.data["count"], 1)

        # Upcoming filter
        resp_upcoming = self.client.get(f"{reverse('event-list')}?upcoming=true")
        self.assertEqual(resp_upcoming.status_code, status.HTTP_200_OK)
        upcoming_titles = [e["title"] for e in resp_upcoming.data["results"]]
        self.assertIn("Intro to ROS2 & Drones", upcoming_titles)
        self.assertNotIn("Spring Hackathon 2025", upcoming_titles)

    # 3. RSVP Operations & Concurrency Constraints
    def test_rsvp_success(self):
        """Verify student can RSVP and seat count updates."""
        self.client.force_authenticate(user=self.student)
        url = reverse('event-rsvp', kwargs={'pk': self.event.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "attending")
        self.assertEqual(response.data["available_seats"], 1)
        self.assertEqual(response.data["attendee_count"], 1)

    def test_rsvp_duplicate_rejection(self):
        """Verify student cannot RSVP twice to the same event."""
        self.client.force_authenticate(user=self.student)
        url = reverse('event-rsvp', kwargs={'pk': self.event.id})
        self.client.post(url)
        # Second attempt
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already registered", response.data["detail"].lower())

    def test_rsvp_capacity_full_rejection(self):
        """Verify event rejects RSVPs when capacity is reached."""
        # Event capacity is 2
        EventRSVP.objects.create(event=self.event, user=self.student, status='attending')
        EventRSVP.objects.create(event=self.event, user=self.other_student, status='attending')

        third_student = User.objects.create_user(
            email="third@state.edu",
            password="Password123!",
            full_name="Third Student"
        )
        self.client.force_authenticate(user=third_student)
        url = reverse('event-rsvp', kwargs={'pk': self.event.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("full capacity", response.data["detail"].lower())

    def test_rsvp_cancellation_and_reactivation(self):
        """Verify cancelling RSVP frees seat, and re-RSVPing reactivates."""
        self.client.force_authenticate(user=self.student)
        url = reverse('event-rsvp', kwargs={'pk': self.event.id})

        # RSVP
        self.client.post(url)
        self.assertEqual(self.event.available_seats, 1)

        # Cancel RSVP
        del_resp = self.client.delete(url)
        self.assertEqual(del_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(del_resp.data["status"], "cancelled")
        self.assertEqual(self.event.available_seats, 2)

        # Re-RSVP
        re_resp = self.client.post(url)
        self.assertEqual(re_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(re_resp.data["status"], "attending")
        self.assertEqual(self.event.available_seats, 1)

    def test_rsvp_started_event_rejected(self):
        """Verify cannot RSVP or cancel after event has started."""
        self.client.force_authenticate(user=self.student)
        url = reverse('event-rsvp', kwargs={'pk': self.past_event.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already started", response.data["detail"].lower())

    # 4. My Events Endpoint
    def test_my_events_list(self):
        """Verify /api/events/my/ returns registered events."""
        EventRSVP.objects.create(event=self.event, user=self.student, status='attending')
        EventRSVP.objects.create(event=self.past_event, user=self.student, status='attending')

        self.client.force_authenticate(user=self.student)
        response = self.client.get(reverse('my-events'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        # Filter upcoming
        resp_up = self.client.get(f"{reverse('my-events')}?filter=upcoming")
        self.assertEqual(resp_up.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_up.data), 1)
        self.assertEqual(resp_up.data[0]["event"]["title"], "Intro to ROS2 & Drones")

    # 5. Attendee List Permissions
    def test_attendee_list_permissions(self):
        """Only organizer and admin can inspect attendee roster."""
        EventRSVP.objects.create(event=self.event, user=self.student, status='attending')
        url = reverse('event-attendees', kwargs={'pk': self.event.id})

        # Regular student -> Forbidden
        self.client.force_authenticate(user=self.student)
        resp_student = self.client.get(url)
        self.assertEqual(resp_student.status_code, status.HTTP_403_FORBIDDEN)

        # Event creator -> OK
        self.client.force_authenticate(user=self.leader)
        resp_leader = self.client.get(url)
        self.assertEqual(resp_leader.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_leader.data["attendees"]), 1)
        self.assertEqual(resp_leader.data["attendees"][0]["email"], "student1@state.edu")

    # 6. Event Modification Permissions
    def test_event_edit_and_delete_permissions(self):
        """Only creator/admin can edit or delete."""
        url = reverse('event-detail', kwargs={'pk': self.event.id})

        # Other student -> Forbidden
        self.client.force_authenticate(user=self.student)
        resp_patch = self.client.patch(url, {"title": "Hacked Event"}, format='json')
        self.assertEqual(resp_patch.status_code, status.HTTP_403_FORBIDDEN)

        # Creator -> Allowed
        self.client.force_authenticate(user=self.leader)
        resp_edit = self.client.patch(url, {"title": "Updated Drone Workshop", "capacity": 50}, format='json')
        self.assertEqual(resp_edit.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_edit.data["title"], "Updated Drone Workshop")
        self.assertEqual(resp_edit.data["capacity"], 50)


class ClubAndCommunityHubTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            email="student@state.edu",
            password="Password123!",
            full_name="Sam Student",
            role="student"
        )
        self.other_student = User.objects.create_user(
            email="other@state.edu",
            password="Password123!",
            full_name="Olivia Other",
            role="student"
        )
        self.leader = User.objects.create_user(
            email="leader@state.edu",
            password="Password123!",
            full_name="Liam Leader",
            role="club_leader"
        )
        self.admin = User.objects.create_user(
            email="admin@state.edu",
            password="Password123!",
            full_name="Admin Boss",
            role="admin",
            is_staff=True
        )

        # Approved Club requiring approval
        self.club = Club.objects.create(
            name="AI Research Club",
            slug="ai-research-club",
            category="Technology",
            description="Frontiers of Artificial Intelligence and Machine Learning.",
            leader=self.leader,
            meeting_schedule="Thursdays @ 6 PM",
            location="Turing Hall 301",
            membership_requires_approval=True,
            is_approved=True
        )
        # Add leader membership
        ClubMembership.objects.create(
            club=self.club,
            user=self.leader,
            role='president',
            status='approved',
            title='President'
        )

        # Open Club not requiring approval
        self.open_club = Club.objects.create(
            name="Gaming Guild",
            slug="gaming-guild",
            category="Creative Arts",
            description="Casual and competitive gaming community.",
            leader=self.leader,
            meeting_schedule="Fridays @ 7 PM",
            membership_requires_approval=False,
            is_approved=True
        )

        # Unapproved club
        self.unapproved_club = Club.objects.create(
            name="Secret Society",
            slug="secret-society",
            category="Culture",
            description="Pending admin sign-off.",
            leader=self.leader,
            is_approved=False
        )

    # 1. Club Creation Permissions
    def test_student_cannot_create_club(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.post(reverse('club-list'), {
            "name": "Unauthorized Club",
            "category": "Technology",
            "description": "Student trying to make a club"
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_leader_can_create_club(self):
        self.client.force_authenticate(user=self.leader)
        res = self.client.post(reverse('club-list'), {
            "name": "Robotics Dev Guild",
            "category": "Technology",
            "description": "Building hardware robots."
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["name"], "Robotics Dev Guild")
        self.assertEqual(res.data["leader_email"], "leader@state.edu")

    # 2. Club Visibility and Filtering
    def test_unapproved_club_hidden_from_public(self):
        res = self.client.get(reverse('club-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should only see approved clubs
        club_names = [c["name"] for c in res.data["results"]]
        self.assertIn("AI Research Club", club_names)
        self.assertIn("Gaming Guild", club_names)
        self.assertNotIn("Secret Society", club_names)

    def test_club_search_and_category_filter(self):
        res_cat = self.client.get(f"{reverse('club-list')}?category=Technology")
        self.assertEqual(res_cat.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_cat.data["results"]), 1)
        self.assertEqual(res_cat.data["results"][0]["name"], "AI Research Club")

        res_search = self.client.get(f"{reverse('club-list')}?search=gaming")
        self.assertEqual(res_search.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_search.data["results"]), 1)
        self.assertEqual(res_search.data["results"][0]["name"], "Gaming Guild")

    # 3. Membership Workflow
    def test_apply_to_club_requiring_approval(self):
        self.client.force_authenticate(user=self.student)
        url = reverse('club-join', kwargs={'pk': self.club.id})
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], "pending")

        membership = ClubMembership.objects.get(club=self.club, user=self.student)
        self.assertEqual(membership.status, "pending")

    def test_prevent_duplicate_membership_application(self):
        self.client.force_authenticate(user=self.student)
        url = reverse('club-join', kwargs={'pk': self.club.id})
        self.client.post(url)

        # Second attempt
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("pending", res.data["detail"].lower())

    def test_join_open_club_immediately_approved(self):
        self.client.force_authenticate(user=self.student)
        url = reverse('club-join', kwargs={'pk': self.open_club.id})
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], "approved")

    def test_prevent_self_approval(self):
        """User cannot approve their own membership."""
        membership = ClubMembership.objects.create(
            club=self.club,
            user=self.student,
            role='member',
            status='pending'
        )
        self.client.force_authenticate(user=self.student)
        approve_url = reverse('club-membership-approve', kwargs={'pk': self.club.id, 'membership_id': membership.id})
        res = self.client.post(approve_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_leader_can_approve_membership(self):
        membership = ClubMembership.objects.create(
            club=self.club,
            user=self.student,
            role='member',
            status='pending'
        )
        self.client.force_authenticate(user=self.leader)
        approve_url = reverse('club-membership-approve', kwargs={'pk': self.club.id, 'membership_id': membership.id})
        res = self.client.post(approve_url, {"role": "moderator", "title": "VP of AI"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        membership.refresh_from_db()
        self.assertEqual(membership.status, "approved")
        self.assertEqual(membership.role, "moderator")
        self.assertEqual(membership.title, "VP of AI")

    def test_leader_can_reject_membership(self):
        membership = ClubMembership.objects.create(
            club=self.club,
            user=self.student,
            role='member',
            status='pending'
        )
        self.client.force_authenticate(user=self.leader)
        reject_url = reverse('club-membership-reject', kwargs={'pk': self.club.id, 'membership_id': membership.id})
        res = self.client.post(reject_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        membership.refresh_from_db()
        self.assertEqual(membership.status, "rejected")

    def test_leave_club(self):
        membership = ClubMembership.objects.create(
            club=self.open_club,
            user=self.student,
            role='member',
            status='approved'
        )
        self.client.force_authenticate(user=self.student)
        leave_url = reverse('club-leave', kwargs={'pk': self.open_club.id})
        res = self.client.delete(leave_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(ClubMembership.objects.filter(club=self.open_club, user=self.student).exists())

    def test_primary_leader_cannot_leave_own_club(self):
        self.client.force_authenticate(user=self.leader)
        leave_url = reverse('club-leave', kwargs={'pk': self.club.id})
        res = self.client.delete(leave_url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot leave", res.data["detail"].lower())

    # 4. Club Community Posts
    def test_member_and_public_post_visibility(self):
        # Public post
        ClubPost.objects.create(
            club=self.club,
            author=self.leader,
            title="Public Welcome",
            content="Welcome to our open lab.",
            post_type="announcement",
            is_members_only=False
        )
        # Member-only post
        ClubPost.objects.create(
            club=self.club,
            author=self.leader,
            title="Internal Lab Keys",
            content="Door code is 1234.",
            post_type="update",
            is_members_only=True
        )

        # Anonymous / Non-member can only see public post
        res_anon = self.client.get(reverse('club-posts', kwargs={'pk': self.club.id}))
        self.assertEqual(res_anon.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_anon.data), 1)
        self.assertEqual(res_anon.data[0]["title"], "Public Welcome")

        # Approved member can see both
        ClubMembership.objects.create(
            club=self.club,
            user=self.student,
            role='member',
            status='approved'
        )
        self.client.force_authenticate(user=self.student)
        res_member = self.client.get(reverse('club-posts', kwargs={'pk': self.club.id}))
        self.assertEqual(res_member.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_member.data), 2)

    def test_post_creation_permissions(self):
        # Non-member cannot post
        self.client.force_authenticate(user=self.student)
        url = reverse('club-posts', kwargs={'pk': self.club.id})
        res_fail = self.client.post(url, {
            "title": "Spam post",
            "content": "Not a member",
            "post_type": "discussion"
        })
        self.assertEqual(res_fail.status_code, status.HTTP_403_FORBIDDEN)

        # Make student an approved member
        ClubMembership.objects.create(
            club=self.club,
            user=self.student,
            role='member',
            status='approved'
        )

        # Approved member can post discussion
        res_disc = self.client.post(url, {
            "title": "Questions about PyTorch",
            "content": "Has anyone tested torch.compile?",
            "post_type": "discussion"
        })
        self.assertEqual(res_disc.status_code, status.HTTP_201_CREATED)

        # Approved member cannot post official announcements
        res_ann = self.client.post(url, {
            "title": "Official meeting cancelled",
            "content": "Fake notice",
            "post_type": "announcement"
        })
        self.assertEqual(res_ann.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_editing_permissions(self):
        ClubMembership.objects.create(
            club=self.club,
            user=self.student,
            role='member',
            status='approved'
        )
        post = ClubPost.objects.create(
            club=self.club,
            author=self.student,
            title="Original Topic",
            content="Original content",
            post_type="discussion"
        )
        detail_url = reverse('club-post-detail', kwargs={'pk': self.club.id, 'post_id': post.id})

        # Other student cannot edit
        self.client.force_authenticate(user=self.other_student)
        res_bad = self.client.patch(detail_url, {"content": "Hacked content"})
        self.assertEqual(res_bad.status_code, status.HTTP_403_FORBIDDEN)

        # Author can edit
        self.client.force_authenticate(user=self.student)
        res_ok = self.client.patch(detail_url, {"content": "Updated content"})
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(res_ok.data["content"], "Updated content")

        # Club leader can delete any post
        self.client.force_authenticate(user=self.leader)
        res_del = self.client.delete(detail_url)
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)

    # 5. Event Waitlist Behavior and Atomic Promotion
    def test_waitlist_joining_when_event_full(self):
        now = timezone.now()
        event = Event.objects.create(
            club=self.club,
            title="Exclusive AI Masterclass",
            category="Tech",
            description="Limited seat seminar.",
            location="Room 501",
            start_time=now + timedelta(days=2),
            end_time=now + timedelta(days=2, hours=2),
            capacity=1,
            is_published=True,
            created_by=self.leader
        )

        # 1st student confirms attendance
        self.client.force_authenticate(user=self.student)
        rsvp_url = reverse('event-rsvp', kwargs={'pk': event.id})
        res1 = self.client.post(rsvp_url)
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data["status"], "attending")

        # 2nd student attempts RSVP -> Added to waitlist
        self.client.force_authenticate(user=self.other_student)
        res2 = self.client.post(rsvp_url, {"waitlist": True}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data["status"], "waitlist")
        self.assertEqual(res2.data["waitlist_position"], 1)

        # Verify waitlist counts
        event.refresh_from_db()
        self.assertEqual(event.rsvp_count, 1)
        self.assertEqual(event.waitlist_count, 1)

    def test_automatic_waitlist_promotion_on_cancellation(self):
        now = timezone.now()
        event = Event.objects.create(
            club=self.club,
            title="Autonomous Drone Workshop",
            category="Tech",
            description="Hands on drone session.",
            location="Room 102",
            start_time=now + timedelta(days=5),
            end_time=now + timedelta(days=5, hours=2),
            capacity=1,
            is_published=True,
            created_by=self.leader
        )

        # Student 1 is attending
        EventRSVP.objects.create(event=event, user=self.student, status='attending')
        # Student 2 is on waitlist
        rsvp2 = EventRSVP.objects.create(event=event, user=self.other_student, status='waitlist')

        # Student 1 cancels attendance
        self.client.force_authenticate(user=self.student)
        rsvp_url = reverse('event-rsvp', kwargs={'pk': event.id})
        res_cancel = self.client.delete(rsvp_url)
        self.assertEqual(res_cancel.status_code, status.HTTP_200_OK)
        self.assertEqual(res_cancel.data["promoted_waitlist_user"]["id"], self.other_student.id)

        # Verify Student 2 was automatically promoted to 'attending'
        rsvp2.refresh_from_db()
        self.assertEqual(rsvp2.status, "attending")
        event.refresh_from_db()
        self.assertEqual(event.rsvp_count, 1)
        self.assertEqual(event.waitlist_count, 0)


class AnnouncementSystemAndTargetingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.now = timezone.now()

        # Admin user
        self.admin = User.objects.create_user(
            email="admin.announcements@state.edu",
            password="Password123!",
            full_name="Dean Administration",
            role="admin",
            is_staff=True,
        )

        # CS Student (Graduation: 2027)
        self.cs_student = User.objects.create_user(
            email="cs.student@state.edu",
            password="Password123!",
            full_name="Charlie CS",
            role="student",
        )
        StudentProfile.objects.create(
            user=self.cs_student,
            department="Computer Science",
            graduation_year=2027,
            student_id="CS-2027-01",
        )

        # MechE Student (Graduation: 2028)
        self.meche_student = User.objects.create_user(
            email="meche.student@state.edu",
            password="Password123!",
            full_name="Dana MechE",
            role="student",
        )
        StudentProfile.objects.create(
            user=self.meche_student,
            department="Mechanical Engineering",
            graduation_year=2028,
            student_id="ME-2028-01",
        )

    def test_admin_can_create_and_publish_announcement(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('announcement-list')
        payload = {
            "title": "Fall Semester Final Exams",
            "content": "Official exam dates and classroom assignments released.",
            "priority": "official",
            "category": "Academic",
            "target_audience": "everyone",
            "is_published": True,
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "Fall Semester Final Exams")
        self.assertEqual(res.data["computed_status"], "published")

    def test_student_cannot_create_announcement(self):
        self.client.force_authenticate(user=self.cs_student)
        url = reverse('announcement-list')
        payload = {
            "title": "Unauthorized Student Post",
            "content": "Testing student announcement creation permission.",
            "priority": "general",
            "target_audience": "everyone",
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_department_targeting_visibility(self):
        # Create announcement for Computer Science department only
        announcement = Announcement.objects.create(
            title="CS Senior Capstone Briefing",
            content="Mandatory briefing for CS department students.",
            priority="urgent",
            author=self.admin,
            target_audience="department",
            target_department="Computer Science",
            is_published=True,
        )

        url = reverse('announcement-list')

        # CS Student should see it
        self.client.force_authenticate(user=self.cs_student)
        res_cs = self.client.get(url)
        self.assertEqual(res_cs.status_code, status.HTTP_200_OK)
        ids_cs = [item["id"] for item in res_cs.data.get("results", res_cs.data)]
        self.assertIn(announcement.id, ids_cs)

        # MechE Student should NOT see it
        self.client.force_authenticate(user=self.meche_student)
        res_meche = self.client.get(url)
        self.assertEqual(res_meche.status_code, status.HTTP_200_OK)
        ids_meche = [item["id"] for item in res_meche.data.get("results", res_meche.data)]
        self.assertNotIn(announcement.id, ids_meche)

        # Public (unauthenticated) visitor should NOT see it
        self.client.force_authenticate(user=None)
        res_public = self.client.get(url)
        ids_pub = [item["id"] for item in res_public.data.get("results", res_public.data)]
        self.assertNotIn(announcement.id, ids_pub)

    def test_graduation_year_targeting_visibility(self):
        announcement = Announcement.objects.create(
            title="Class of 2027 Internship Program",
            content="Exclusive opportunities for sophomore/junior 2027 cohort.",
            priority="official",
            author=self.admin,
            target_audience="graduation_year",
            target_graduation_year=2027,
            is_published=True,
        )

        url = reverse('announcement-list')

        # 2027 Student sees it
        self.client.force_authenticate(user=self.cs_student)
        res_2027 = self.client.get(url)
        ids_2027 = [item["id"] for item in res_2027.data.get("results", res_2027.data)]
        self.assertIn(announcement.id, ids_2027)

        # 2028 Student does NOT see it
        self.client.force_authenticate(user=self.meche_student)
        res_2028 = self.client.get(url)
        ids_2028 = [item["id"] for item in res_2028.data.get("results", res_2028.data)]
        self.assertNotIn(announcement.id, ids_2028)

    def test_scheduled_publication_hidden_from_students(self):
        future_time = timezone.now() + timedelta(days=2)
        scheduled_announcement = Announcement.objects.create(
            title="Future Chancellor Address",
            content="Embargoed until scheduled release time.",
            priority="official",
            author=self.admin,
            target_audience="everyone",
            is_published=True,
            scheduled_at=future_time,
        )

        url = reverse('announcement-list')

        # Hidden from students
        self.client.force_authenticate(user=self.cs_student)
        res = self.client.get(url)
        ids = [item["id"] for item in res.data.get("results", res.data)]
        self.assertNotIn(scheduled_announcement.id, ids)

        # Visible to Admin in admin listing
        self.client.force_authenticate(user=self.admin)
        res_admin = self.client.get(f"{url}?status=scheduled")
        ids_admin = [item["id"] for item in res_admin.data.get("results", res_admin.data)]
        self.assertIn(scheduled_announcement.id, ids_admin)

    def test_expired_announcement_hidden_from_students(self):
        past_time = timezone.now() - timedelta(days=1)
        expired_announcement = Announcement.objects.create(
            title="Yesterday Campus Power Outage Notice",
            content="Power outage resolved.",
            priority="urgent",
            author=self.admin,
            target_audience="everyone",
            is_published=True,
            expires_at=past_time,
        )

        url = reverse('announcement-list')

        # Hidden from students
        self.client.force_authenticate(user=self.cs_student)
        res = self.client.get(url)
        ids = [item["id"] for item in res.data.get("results", res.data)]
        self.assertNotIn(expired_announcement.id, ids)

        # Visible to Admin under expired filter
        self.client.force_authenticate(user=self.admin)
        res_admin = self.client.get(f"{url}?status=expired")
        ids_admin = [item["id"] for item in res_admin.data.get("results", res_admin.data)]
        self.assertIn(expired_announcement.id, ids_admin)

    def test_admin_update_and_delete_announcement(self):
        announcement = Announcement.objects.create(
            title="Initial Title",
            content="Initial text.",
            priority="general",
            author=self.admin,
            is_published=True,
        )

        detail_url = reverse('announcement-detail', kwargs={'pk': announcement.id})

        # Student cannot update
        self.client.force_authenticate(user=self.cs_student)
        res_fail = self.client.patch(detail_url, {"title": "Hacked Title"}, format='json')
        self.assertEqual(res_fail.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can update
        self.client.force_authenticate(user=self.admin)
        res_update = self.client.patch(detail_url, {"title": "Updated Official Title"}, format='json')
        self.assertEqual(res_update.status_code, status.HTTP_200_OK)
        self.assertEqual(res_update.data["title"], "Updated Official Title")

        # Admin can delete
        res_del = self.client.delete(detail_url)
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Announcement.objects.filter(pk=announcement.id).exists())


class NotificationSystemAndTriggerTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.now = timezone.now()

        # Users
        self.student = User.objects.create_user(
            email="eva.student@state.edu",
            password="Password123!",
            full_name="Eva Student",
            role="student",
        )
        self.other_student = User.objects.create_user(
            email="frank.student@state.edu",
            password="Password123!",
            full_name="Frank Student",
            role="student",
        )
        self.leader = User.objects.create_user(
            email="leader.notifications@state.edu",
            password="Password123!",
            full_name="Grace Leader",
            role="club_leader",
        )

        # Club
        self.club = Club.objects.create(
            name="AI & Data Science Society",
            slug="ai-data-science",
            category="STEM",
            description="Machine learning and deep learning projects.",
            leader=self.leader,
        )

        # Event
        self.event = Event.objects.create(
            club=self.club,
            title="PyTorch Deep Dive",
            category="Tech",
            description="Transformer architecture walkthrough.",
            location="Turing Hall 101",
            start_time=self.now + timedelta(days=2),
            end_time=self.now + timedelta(days=2, hours=2),
            capacity=1,
            is_published=True,
            created_by=self.leader,
        )

    def test_recipient_isolation(self):
        # Create notification for student
        notif = Notification.objects.create(
            recipient=self.student,
            notification_type='system',
            title='Confidential Alert for Eva',
            message='Your student ID has been activated.',
        )

        # Other student attempts to access
        self.client.force_authenticate(user=self.other_student)
        url = reverse('notification-list')
        res = self.client.get(url)
        ids = [item["id"] for item in res.data.get("results", res.data)]
        self.assertNotIn(notif.id, ids)

        # Other student attempts to mark read
        mark_read_url = reverse('notification-mark-read', kwargs={'pk': notif.id})
        res_mark = self.client.post(mark_read_url)
        self.assertEqual(res_mark.status_code, status.HTTP_404_NOT_FOUND)

        # Recipient can view and mark read
        self.client.force_authenticate(user=self.student)
        res_own = self.client.get(url)
        ids_own = [item["id"] for item in res_own.data.get("results", res_own.data)]
        self.assertIn(notif.id, ids_own)

        res_read = self.client.post(mark_read_url)
        self.assertEqual(res_read.status_code, status.HTTP_200_OK)
        notif.refresh_from_db()
        self.assertTrue(notif.is_read)

    def test_unread_count_and_mark_all_read(self):
        # Create 3 unread notifications for student
        for i in range(3):
            Notification.objects.create(
                recipient=self.student,
                notification_type='system',
                title=f'Alert {i}',
                message=f'Message {i}',
                is_read=False,
            )

        self.client.force_authenticate(user=self.student)

        # Check unread count
        count_url = reverse('notification-unread-count')
        res_count = self.client.get(count_url)
        self.assertEqual(res_count.status_code, status.HTTP_200_OK)
        self.assertEqual(res_count.data["unread_count"], 3)

        # Mark all read
        mark_all_url = reverse('notification-read-all')
        res_all = self.client.post(mark_all_url)
        self.assertEqual(res_all.status_code, status.HTTP_200_OK)
        self.assertEqual(res_all.data["unread_count"], 0)

        # Verify in DB
        unread_remaining = Notification.objects.filter(recipient=self.student, is_read=False).count()
        self.assertEqual(unread_remaining, 0)

    def test_notification_preferences_get_and_update(self):
        self.client.force_authenticate(user=self.student)
        pref_url = reverse('notification-preferences')

        # Get default preferences (all true)
        res = self.client.get(pref_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["announcements"])
        self.assertTrue(res.data["event_reminders"])
        self.assertTrue(res.data["rsvp_updates"])

        # Disable announcements and event reminders
        patch_res = self.client.patch(pref_url, {"announcements": False, "event_reminders": False}, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertFalse(patch_res.data["announcements"])
        self.assertFalse(patch_res.data["event_reminders"])
        self.assertTrue(patch_res.data["rsvp_updates"])

    def test_event_rsvp_trigger_creates_notification(self):
        self.client.force_authenticate(user=self.student)
        rsvp_url = reverse('event-rsvp', kwargs={'pk': self.event.id})

        res = self.client.post(rsvp_url, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "attending")

        # Verify notification was generated for student
        notif = Notification.objects.filter(
            recipient=self.student,
            notification_type='event_rsvp',
            related_event=self.event,
        ).first()
        self.assertIsNotNone(notif)
        self.assertIn("RSVP Confirmed", notif.title)
        self.assertIn(self.event.title, notif.message)

    def test_event_waitlist_and_promotion_triggers(self):
        # Student 1 takes the 1 seat
        EventRSVP.objects.create(event=self.event, user=self.student, status='attending')

        # Student 2 joins waitlist
        self.client.force_authenticate(user=self.other_student)
        rsvp_url = reverse('event-rsvp', kwargs={'pk': self.event.id})
        res_wl = self.client.post(rsvp_url, {"waitlist": True}, format='json')
        self.assertEqual(res_wl.status_code, status.HTTP_200_OK)
        self.assertEqual(res_wl.data["status"], "waitlist")

        # Verify waitlist notification created
        wl_notif = Notification.objects.filter(
            recipient=self.other_student,
            notification_type='event_rsvp',
            title__icontains='Waitlist Joined',
        ).first()
        self.assertIsNotNone(wl_notif)

        # Student 1 cancels -> triggers automatic promotion for Student 2
        self.client.force_authenticate(user=self.student)
        res_cancel = self.client.delete(rsvp_url)
        self.assertEqual(res_cancel.status_code, status.HTTP_200_OK)

        # Verify waitlist promotion notification was created for Student 2
        promo_notif = Notification.objects.filter(
            recipient=self.other_student,
            notification_type='waitlist_promotion',
        ).first()
        self.assertIsNotNone(promo_notif)
        self.assertIn("Promoted from Waitlist", promo_notif.title)

    def test_club_membership_approval_and_rejection_triggers(self):
        # Student applies for membership
        membership = ClubMembership.objects.create(
            club=self.club,
            user=self.student,
            role='member',
            status='pending',
        )

        # Leader approves application
        self.client.force_authenticate(user=self.leader)
        approve_url = reverse(
            'club-membership-approve',
            kwargs={'pk': self.club.slug, 'membership_id': membership.id}
        )
        res_appr = self.client.post(approve_url, {"role": "member"}, format='json')
        self.assertEqual(res_appr.status_code, status.HTTP_200_OK)

        # Verify approval notification generated
        appr_notif = Notification.objects.filter(
            recipient=self.student,
            notification_type='club_application_approved',
            related_club=self.club,
        ).first()
        self.assertIsNotNone(appr_notif)
        self.assertIn("Membership Approved", appr_notif.title)

        # Leader rejects/removes member
        reject_url = reverse(
            'club-membership-reject',
            kwargs={'pk': self.club.slug, 'membership_id': membership.id}
        )
        res_rej = self.client.post(reject_url, format='json')
        self.assertEqual(res_rej.status_code, status.HTTP_200_OK)

        # Verify rejection notification generated
        rej_notif = Notification.objects.filter(
            recipient=self.student,
            notification_type='club_application_rejected',
            related_club=self.club,
        ).first()
        self.assertIsNotNone(rej_notif)
        self.assertIn("Membership Update", rej_notif.title)

    def test_event_reminders_command_eligibility(self):
        # Create event 24 hours from now
        now = timezone.now()
        event_24h = Event.objects.create(
            club=self.club,
            title="Quantum Computing Seminar",
            category="Tech",
            description="24 hour reminder test.",
            location="Room 303",
            start_time=now + timedelta(hours=24),
            end_time=now + timedelta(hours=26),
            capacity=10,
            is_published=True,
            created_by=self.leader,
        )

        # Eva has active attending RSVP
        EventRSVP.objects.create(event=event_24h, user=self.student, status='attending')

        # Frank has cancelled RSVP
        EventRSVP.objects.create(event=event_24h, user=self.other_student, status='cancelled')

        # Execute management command
        call_command('send_event_reminders')

        # Eva should have received a 24h reminder notification
        eva_reminder = Notification.objects.filter(
            recipient=self.student,
            related_event=event_24h,
            notification_type='event_reminder',
        ).first()
        self.assertIsNotNone(eva_reminder)
        self.assertIn("starts in 24 hours", eva_reminder.title)

        # Frank (cancelled) should NOT receive reminder
        frank_reminder = Notification.objects.filter(
            recipient=self.other_student,
            related_event=event_24h,
            notification_type='event_reminder',
        ).first()
        self.assertIsNone(frank_reminder)

        # Run command again -> should not create duplicates
        initial_count = Notification.objects.filter(related_event=event_24h).count()
        call_command('send_event_reminders')
        after_count = Notification.objects.filter(related_event=event_24h).count()
        self.assertEqual(initial_count, after_count)


class Phase6RealtimeCommunityAndAttendanceTests(TestCase):
    """
    Automated test suite for CampusHub Phase 6:
    - Real-Time Notifications
    - Club Community Chat
    - Event Q&A Discussions
    - Digital QR Tickets
    - Scanner Check-In & Duplicate Prevention
    - Live Attendance Tracking
    - Channels WebSockets
    """

    def setUp(self):
        from users.models import User
        self.client = APIClient()
        self.now = timezone.now()

        # Users
        self.leader = User.objects.create_user(
            email="leader.test@state.edu",
            password="Password123!",
            full_name="Maya Lin",
            role="club_leader"
        )
        self.student = User.objects.create_user(
            email="student.test@state.edu",
            password="Password123!",
            full_name="Alex Rivera",
            role="student"
        )
        self.other_student = User.objects.create_user(
            email="other.test@state.edu",
            password="Password123!",
            full_name="Jordan Bell",
            role="student"
        )

        # Club
        self.club = Club.objects.create(
            name="AI & Robotics Club",
            slug="ai-robotics",
            category="STEM",
            description="Robotics community.",
            leader=self.leader,
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
            title="Autonomous Rover Showcase",
            category="Tech",
            description="Testing autonomous rovers.",
            location="Robotics Lab 101",
            start_time=self.now + timedelta(days=2),
            end_time=self.now + timedelta(days=2, hours=3),
            capacity=1,  # Capacity of 1 to test waitlist
            is_published=True,
            created_by=self.leader
        )

        # Other Event for cross-event ticket checks
        self.other_event = Event.objects.create(
            club=self.club,
            title="Quantum Lab Tour",
            category="Tech",
            description="Quantum physics walkthrough.",
            location="Physics B04",
            start_time=self.now + timedelta(days=4),
            end_time=self.now + timedelta(days=4, hours=2),
            capacity=10,
            is_published=True,
            created_by=self.leader
        )

    # 1. Ticket Creation & Invalidation
    def test_ticket_creation_on_confirmed_rsvp(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f"/api/events/{self.event.id}/rsvp/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "attending")

        ticket = EventTicket.objects.filter(event=self.event, attendee=self.student).first()
        self.assertIsNotNone(ticket)
        self.assertEqual(ticket.status, "valid")
        self.assertTrue(ticket.ticket_code.startswith("CH-TKT-"))
        self.assertIn("CH-TCK-", ticket.qr_payload)
        self.assertIn("<svg", ticket.qr_code_svg)

    def test_ticket_invalidation_on_rsvp_cancellation(self):
        self.client.force_authenticate(user=self.student)
        self.client.post(f"/api/events/{self.event.id}/rsvp/")
        ticket = EventTicket.objects.get(event=self.event, attendee=self.student)
        self.assertEqual(ticket.status, "valid")

        # Cancel RSVP
        del_res = self.client.delete(f"/api/events/{self.event.id}/rsvp/")
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)

        ticket.refresh_from_db()
        self.assertEqual(ticket.status, "cancelled")

    def test_ticket_generation_on_waitlist_promotion(self):
        # Student 1 fills capacity (1/1)
        self.client.force_authenticate(user=self.student)
        self.client.post(f"/api/events/{self.event.id}/rsvp/")

        # Student 2 joins waitlist (position 1)
        self.client.force_authenticate(user=self.other_student)
        w_res = self.client.post(f"/api/events/{self.event.id}/rsvp/", {"waitlist": True}, format="json")
        self.assertEqual(w_res.status_code, status.HTTP_200_OK)
        self.assertEqual(w_res.data["status"], "waitlist")
        self.assertFalse(EventTicket.objects.filter(event=self.event, attendee=self.other_student).exists())

        # Student 1 cancels -> triggers automatic waitlist promotion for Student 2
        self.client.force_authenticate(user=self.student)
        self.client.delete(f"/api/events/{self.event.id}/rsvp/")

        # Student 2 should now have an active valid ticket
        promoted_ticket = EventTicket.objects.filter(event=self.event, attendee=self.other_student).first()
        self.assertIsNotNone(promoted_ticket)
        self.assertEqual(promoted_ticket.status, "valid")

    # 2. Check-In Scanner & Concurrency / Duplicate Prevention
    def test_checkin_validation_and_duplicate_prevention(self):
        # Student RSVPs
        self.client.force_authenticate(user=self.student)
        self.client.post(f"/api/events/{self.event.id}/rsvp/")
        ticket = EventTicket.objects.get(event=self.event, attendee=self.student)

        # Leader checks in attendee
        self.client.force_authenticate(user=self.leader)
        checkin_res = self.client.post(
            f"/api/events/{self.event.id}/check-in/",
            {"ticket_code": ticket.ticket_code},
            format="json"
        )
        self.assertEqual(checkin_res.status_code, status.HTTP_200_OK)
        self.assertFalse(checkin_res.data["duplicate"])
        self.assertEqual(checkin_res.data["checked_in_count"], 1)

        ticket.refresh_from_db()
        self.assertTrue(ticket.is_checked_in)
        self.assertIsNotNone(ticket.checked_in_at)

        # Duplicate scan attempt
        dup_res = self.client.post(
            f"/api/events/{self.event.id}/check-in/",
            {"ticket_code": ticket.ticket_code},
            format="json"
        )
        self.assertEqual(dup_res.status_code, status.HTTP_200_OK)
        self.assertTrue(dup_res.data["duplicate"])
        self.assertIn("already checked in", dup_res.data["message"].lower())
        self.assertEqual(dup_res.data["checked_in_count"], 1)

    def test_cross_event_ticket_rejection(self):
        # Student gets ticket for other_event
        self.client.force_authenticate(user=self.student)
        self.client.post(f"/api/events/{self.other_event.id}/rsvp/")
        other_ticket = EventTicket.objects.get(event=self.other_event, attendee=self.student)

        # Attempt to scan ticket at event
        self.client.force_authenticate(user=self.leader)
        res = self.client.post(
            f"/api/events/{self.event.id}/check-in/",
            {"ticket_code": other_ticket.ticket_code},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not this event", res.data["detail"].lower())

    def test_cancelled_ticket_checkin_rejection(self):
        self.client.force_authenticate(user=self.student)
        self.client.post(f"/api/events/{self.event.id}/rsvp/")
        ticket = EventTicket.objects.get(event=self.event, attendee=self.student)
        self.client.delete(f"/api/events/{self.event.id}/rsvp/")

        self.client.force_authenticate(user=self.leader)
        res = self.client.post(
            f"/api/events/{self.event.id}/check-in/",
            {"ticket_code": ticket.ticket_code},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cancelled", res.data["detail"].lower())

    def test_checkin_unauthorized_rejection(self):
        self.client.force_authenticate(user=self.student)
        self.client.post(f"/api/events/{self.event.id}/rsvp/")
        ticket = EventTicket.objects.get(event=self.event, attendee=self.student)

        # Unauthorized student attempts to check in
        self.client.force_authenticate(user=self.other_student)
        res = self.client.post(
            f"/api/events/{self.event.id}/check-in/",
            {"ticket_code": ticket.ticket_code},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # 3. Live Attendance & Manual Check-In
    def test_attendance_dashboard_and_manual_toggle(self):
        self.client.force_authenticate(user=self.student)
        self.client.post(f"/api/events/{self.event.id}/rsvp/")

        # Organizer views attendance
        self.client.force_authenticate(user=self.leader)
        att_res = self.client.get(f"/api/events/{self.event.id}/attendance/")
        self.assertEqual(att_res.status_code, status.HTTP_200_OK)
        self.assertEqual(att_res.data["registered_count"], 1)
        self.assertEqual(att_res.data["checked_in_count"], 0)

        # Manual check-in
        man_res = self.client.post(
            f"/api/events/{self.event.id}/attendance/manual/",
            {"attendee_id": self.student.id, "is_checked_in": True},
            format="json"
        )
        self.assertEqual(man_res.status_code, status.HTTP_200_OK)
        self.assertTrue(man_res.data["is_checked_in"])
        self.assertEqual(man_res.data["checked_in_count"], 1)

        # Export CSV
        csv_res = self.client.get(f"/api/events/{self.event.id}/attendance/export/")
        self.assertEqual(csv_res.status_code, status.HTTP_200_OK)
        self.assertEqual(csv_res["Content-Type"], "text/csv")
        self.assertIn("Alex Rivera", csv_res.content.decode("utf-8"))

    # 4. Event Q&A
    def test_event_qa_question_answer_and_upvote(self):
        # Student creates question
        self.client.force_authenticate(user=self.student)
        q_res = self.client.post(
            f"/api/events/{self.event.id}/questions/",
            {"content": "Will hardware kits be provided on site?"},
            format="json"
        )
        self.assertEqual(q_res.status_code, status.HTTP_201_CREATED)
        question_id = q_res.data["id"]

        # Upvote question
        up_res = self.client.post(f"/api/events/questions/{question_id}/upvote/")
        self.assertEqual(up_res.status_code, status.HTTP_200_OK)
        self.assertTrue(up_res.data["has_upvoted"])
        self.assertEqual(up_res.data["upvotes_count"], 1)

        # Upvote again -> toggles off
        up2_res = self.client.post(f"/api/events/questions/{question_id}/upvote/")
        self.assertFalse(up2_res.data["has_upvoted"])
        self.assertEqual(up2_res.data["upvotes_count"], 0)

        # Organizer answers with official badge
        self.client.force_authenticate(user=self.leader)
        ans_res = self.client.post(
            f"/api/events/questions/{question_id}/answers/",
            {"content": "Yes, all microcontrollers and batteries will be provided."},
            format="json"
        )
        self.assertEqual(ans_res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(ans_res.data["is_official"])

    # 5. Club Community Chat
    def test_club_chat_member_authorization_and_message_lifecycle(self):
        # Approved member gets messages
        self.client.force_authenticate(user=self.student)
        msg_res = self.client.get(f"/api/clubs/{self.club.id}/messages/")
        self.assertEqual(msg_res.status_code, status.HTTP_200_OK)

        # Non-member rejected (403)
        self.client.force_authenticate(user=self.other_student)
        rej_res = self.client.get(f"/api/clubs/{self.club.id}/messages/")
        self.assertEqual(rej_res.status_code, status.HTTP_403_FORBIDDEN)

        # Create message
        msg = ClubMessage.objects.create(
            club=self.club,
            sender=self.student,
            content="Excited for Friday's rover demo!"
        )
        self.assertFalse(msg.is_deleted)
        self.assertFalse(msg.content.startswith("[Deleted]"))



