import secrets
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from users.models import StudentProfile
from campus.models import (
    Club, Event, EventRSVP, ClubMembership, ClubPost,
    Announcement, Notification, NotificationPreference,
    ClubMessage, EventQuestion, EventQuestionUpvote, EventAnswer, EventTicket
)

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds deterministic, repeatable demo data for CampusHub portfolio demonstration."

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reset demo entities before seeding',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== Seeding CampusHub Production Demo Data ==="))

        with transaction.atomic():
            now = timezone.now()
            demo_password = "CampusDemo2026!"

            # ------------------------------------------------------------------
            # 1. Standard Demo Accounts (Student, Club Leader, Admin)
            # ------------------------------------------------------------------
            self.stdout.write("Creating documented demo accounts...")

            admin_user, _ = User.objects.get_or_create(
                email="admin@campushub.edu",
                defaults={
                    "full_name": "Dr. Sarah Jenkins",
                    "role": "admin",
                    "is_staff": True,
                    "is_superuser": True,
                }
            )
            admin_user.set_password(demo_password)
            admin_user.save()

            leader_user, _ = User.objects.get_or_create(
                email="leader@campushub.edu",
                defaults={
                    "full_name": "Marcus Chen",
                    "role": "club_leader",
                }
            )
            leader_user.set_password(demo_password)
            leader_user.save()
            StudentProfile.objects.get_or_create(
                user=leader_user,
                defaults={
                    "student_id": "CH-2026-001",
                    "department": "Computer Science",
                    "graduation_year": 2026,
                    "bio": "Robotics Club President & Autonomous Systems researcher.",
                }
            )

            student_user, _ = User.objects.get_or_create(
                email="student@campushub.edu",
                defaults={
                    "full_name": "Aria Patel",
                    "role": "student",
                }
            )
            student_user.set_password(demo_password)
            student_user.save()
            StudentProfile.objects.get_or_create(
                user=student_user,
                defaults={
                    "student_id": "CH-2026-108",
                    "department": "Computer Science",
                    "graduation_year": 2027,
                    "bio": "Sophomore exploring distributed systems and design engineering.",
                }
            )

            # Additional peer students for realistic attendance & waitlists
            peer1, _ = User.objects.get_or_create(
                email="jordan.lee@campushub.edu",
                defaults={"full_name": "Jordan Lee", "role": "student"}
            )
            peer1.set_password(demo_password)
            peer1.save()
            StudentProfile.objects.get_or_create(
                user=peer1,
                defaults={"student_id": "CH-2026-204", "department": "Electrical Engineering", "graduation_year": 2026}
            )

            peer2, _ = User.objects.get_or_create(
                email="elena.rostova@campushub.edu",
                defaults={"full_name": "Elena Rostova", "role": "student"}
            )
            peer2.set_password(demo_password)
            peer2.save()
            StudentProfile.objects.get_or_create(
                user=peer2,
                defaults={"student_id": "CH-2026-319", "department": "Design & Media", "graduation_year": 2027}
            )

            # ------------------------------------------------------------------
            # 2. Student Clubs & Organizations
            # ------------------------------------------------------------------
            self.stdout.write("Seeding student organizations...")

            robotics_club, _ = Club.objects.get_or_create(
                name="Robotics & Autonomous Systems",
                defaults={
                    "slug": "robotics-autonomous-systems",
                    "category": "Technology",
                    "description": "Building next-generation quadrupeds, rover navigation stacks, and edge AI hardware.",
                    "leader": leader_user,
                    "meeting_schedule": "Tuesdays & Thursdays at 6:00 PM",
                    "location": "Engineering Lab 402",
                    "accent_color": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
                    "banner_gradient": "from-indigo-600 to-blue-700",
                    "is_approved": True,
                    "membership_requires_approval": False,
                    "tags": ["Robotics", "ROS2", "Computer Vision", "Hardware"],
                }
            )

            design_club, _ = Club.objects.get_or_create(
                name="Design & Innovation Collective",
                defaults={
                    "slug": "design-innovation-collective",
                    "category": "Creative Arts",
                    "description": "Cross-disciplinary studio for product design, interface typography, and interactive art.",
                    "leader": leader_user,
                    "meeting_schedule": "Wednesdays at 5:30 PM",
                    "location": "Design Studio B, Arts Center",
                    "accent_color": "bg-violet-500/10 text-violet-500 border-violet-500/20",
                    "banner_gradient": "from-purple-600 to-pink-600",
                    "is_approved": True,
                    "membership_requires_approval": True,
                    "tags": ["UI/UX", "Typography", "Figma", "Design Systems"],
                }
            )

            acm_club, _ = Club.objects.get_or_create(
                name="ACM Student Chapter",
                defaults={
                    "slug": "acm-student-chapter",
                    "category": "Technology",
                    "description": "Fostering algorithmic problem solving, open-source engineering, and research seminars.",
                    "leader": leader_user,
                    "meeting_schedule": "Mondays at 7:00 PM",
                    "location": "Turing Auditorium",
                    "accent_color": "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
                    "banner_gradient": "from-cyan-600 to-blue-800",
                    "is_approved": True,
                    "membership_requires_approval": False,
                    "tags": ["Algorithms", "Competitive Programming", "Open Source"],
                }
            )


            # Memberships
            ClubMembership.objects.get_or_create(
                club=robotics_club, user=leader_user,
                defaults={"role": "president", "status": "approved", "title": "Founder & Lab Director"}
            )
            ClubMembership.objects.get_or_create(
                club=robotics_club, user=student_user,
                defaults={"role": "member", "status": "approved", "title": "Perception Subteam"}
            )
            ClubMembership.objects.get_or_create(
                club=robotics_club, user=peer1,
                defaults={"role": "member", "status": "approved", "title": "Firmware Engineer"}
            )
            ClubMembership.objects.get_or_create(
                club=design_club, user=peer2,
                defaults={"role": "vice_president", "status": "approved", "title": "Design Lead"}
            )

            # ------------------------------------------------------------------
            # 3. Events with Controlled Capacities
            # ------------------------------------------------------------------
            self.stdout.write("Seeding campus events and registration states...")

            # Event 1: Flagship Hackathon (Upcoming)
            hackathon, _ = Event.objects.get_or_create(
                title="Campus Innovation Hackathon 2026",
                defaults={
                    "club": robotics_club,
                    "category": "Tech",
                    "description": "36 hours of rapid product prototyping, AI systems engineering, and hardware builds with $15,000 in prizes.",
                    "location": "Student Innovation Pavilion",
                    "start_time": now + timedelta(days=5, hours=10),
                    "end_time": now + timedelta(days=6, hours=22),
                    "capacity": 150,
                    "featured": True,
                    "image_gradient": "from-indigo-600 via-blue-600 to-indigo-800",
                    "is_published": True,
                    "created_by": leader_user,
                    "tags": ["Hackathon", "AI", "Hardware", "Prizes"],
                }
            )

            # Event 2: Full Event with Waitlist Demonstration
            workshop, _ = Event.objects.get_or_create(
                title="Generative AI & Agentic Architectures Workshop",
                defaults={
                    "club": acm_club,
                    "category": "Tech",
                    "description": "Hands-on masterclass building stateful autonomous LLM agents and multi-agent systems.",
                    "location": "Computer Science Hall 101",
                    "start_time": now + timedelta(days=2, hours=14),
                    "end_time": now + timedelta(days=2, hours=17),
                    "capacity": 2,  # Intentionally small capacity to demonstrate waitlist
                    "featured": True,
                    "image_gradient": "from-cyan-600 to-indigo-700",
                    "is_published": True,
                    "created_by": leader_user,
                    "tags": ["Agents", "LLMs", "Workshop"],
                }
            )

            # Event 3: Today's Live Check-In Demo Event
            live_event, _ = Event.objects.get_or_create(
                title="Autonomous Robotics Live Showcase & Check-In",
                defaults={
                    "club": robotics_club,
                    "category": "Tech",
                    "description": "Live obstacle navigation demo with real-time QR check-in and attendance tracking demonstration.",
                    "location": "Robotics Arena & Maker Courtyard",
                    "start_time": now - timedelta(hours=1),
                    "end_time": now + timedelta(hours=3),
                    "capacity": 50,
                    "featured": True,
                    "image_gradient": "from-blue-600 to-teal-600",
                    "is_published": True,
                    "created_by": leader_user,
                    "tags": ["Robotics", "Live Demo", "Attendance"],
                }
            )

            # ------------------------------------------------------------------
            # 4. RSVPs, Waitlist, Tickets & Attendance
            # ------------------------------------------------------------------
            self.stdout.write("Generating RSVPs, QR tickets, and attendance check-ins...")

            # Hackathon: Student registered with valid ticket
            rsvp_hack, _ = EventRSVP.objects.get_or_create(
                event=hackathon, user=student_user,
                defaults={"status": "attending"}
            )
            EventTicket.objects.get_or_create(
                event=hackathon, attendee=student_user,
                defaults={
                    "rsvp": rsvp_hack,
                    "ticket_code": "CH-TKT-HACK2026",
                    "qr_payload": f"CH-TCK-{hackathon.id}-{student_user.id}-DEMO1",
                    "status": "valid",
                    "is_checked_in": False,
                }
            )

            # Workshop (capacity 2): peer1 and peer2 fill capacity; student_user is waitlisted!
            EventRSVP.objects.get_or_create(event=workshop, user=peer1, defaults={"status": "attending"})
            EventRSVP.objects.get_or_create(event=workshop, user=peer2, defaults={"status": "attending"})
            EventRSVP.objects.get_or_create(
                event=workshop, user=student_user,
                defaults={"status": "waitlist"}
            )

            # Live Event: peer1 checked in; student_user has valid ticket ready to scan
            live_rsvp_peer1, _ = EventRSVP.objects.get_or_create(
                event=live_event, user=peer1,
                defaults={"status": "attending"}
            )
            EventTicket.objects.get_or_create(
                event=live_event, attendee=peer1,
                defaults={
                    "rsvp": live_rsvp_peer1,
                    "ticket_code": "CH-TKT-LIVE001",
                    "qr_payload": f"CH-TCK-{live_event.id}-{peer1.id}-PEER1",
                    "status": "used",
                    "is_checked_in": True,
                    "checked_in_at": now - timedelta(minutes=25),
                    "checked_in_by": leader_user,
                }
            )

            live_rsvp_student, _ = EventRSVP.objects.get_or_create(
                event=live_event, user=student_user,
                defaults={"status": "attending"}
            )
            EventTicket.objects.get_or_create(
                event=live_event, attendee=student_user,
                defaults={
                    "rsvp": live_rsvp_student,
                    "ticket_code": "CH-TKT-LIVE002",
                    "qr_payload": f"CH-TCK-{live_event.id}-{student_user.id}-STUDENT",
                    "status": "valid",
                    "is_checked_in": False,
                }
            )

            # ------------------------------------------------------------------
            # 5. Campus Announcements
            # ------------------------------------------------------------------
            self.stdout.write("Publishing verified campus announcements...")

            Announcement.objects.get_or_create(
                title="Spring 2026 Academic Calendar & Finals Schedule Released",
                defaults={
                    "content": "The official university registrar has published the Spring 2026 examination timetable. Please review course prerequisites and scheduling conflicts.",
                    "author": admin_user,
                    "priority": "normal",
                    "target_audience": "everyone",
                    "is_published": True,
                    "published_at": now - timedelta(days=2),
                }
            )

            Announcement.objects.get_or_create(
                title="Urgent: Student Center Wi-Fi Maintenance Tonight",
                defaults={
                    "content": "Network engineering will be upgrading high-density access points across the Student Pavilion between 11:00 PM and 3:00 AM.",
                    "author": admin_user,
                    "priority": "urgent",
                    "target_audience": "everyone",
                    "is_published": True,
                    "published_at": now - timedelta(hours=4),
                }
            )

            Announcement.objects.get_or_create(
                title="Computer Science Department: Undergraduate Research Grants",
                defaults={
                    "content": "Applications for NSF-backed summer undergraduate research fellowships are now open for CS and Data Science students.",
                    "author": admin_user,
                    "priority": "high",
                    "target_audience": "department",
                    "target_department": "Computer Science",
                    "is_published": True,
                    "published_at": now - timedelta(days=1),
                }
            )

            # ------------------------------------------------------------------
            # 6. Notifications
            # ------------------------------------------------------------------
            self.stdout.write("Generating sample student notifications...")

            Notification.objects.get_or_create(
                recipient=student_user,
                notification_type="event_rsvp",
                title="RSVP Confirmed: Campus Innovation Hackathon 2026",
                defaults={
                    "message": "Your seat and digital ticket for Campus Innovation Hackathon 2026 are confirmed. View your QR ticket in your dashboard.",
                    "related_event": hackathon,
                    "link_url": "/dashboard/tickets",
                    "is_read": False,
                }
            )

            Notification.objects.get_or_create(
                recipient=student_user,
                notification_type="waitlist_promotion",
                title="Waitlist Position: Generative AI Workshop",
                defaults={
                    "message": "You are currently #1 on the waitlist for Generative AI & Agentic Architectures Workshop.",
                    "related_event": workshop,
                    "link_url": f"/events/{workshop.id}",
                    "is_read": False,
                }
            )

            Notification.objects.get_or_create(
                recipient=student_user,
                notification_type="announcement",
                title="Campus Alert: Student Center Wi-Fi Maintenance",
                defaults={
                    "message": "Scheduled access point maintenance tonight at the Student Pavilion.",
                    "is_read": True,
                }
            )

            NotificationPreference.objects.get_or_create(
                user=student_user,
                defaults={
                    "announcements": True,
                    "event_reminders": True,
                    "rsvp_updates": True,
                    "waitlist_promotions": True,
                    "club_activity": True,
                    "email_notifications": True,
                }
            )

            # ------------------------------------------------------------------
            # 7. Real-Time Club Messages & Community Posts
            # ------------------------------------------------------------------
            self.stdout.write("Seeding club chat and community posts...")

            ClubPost.objects.get_or_create(
                club=robotics_club,
                title="Welcome to Spring 2026 Robotics Season!",
                defaults={
                    "content": "We are kicking off our autonomous rover navigation sprints this Thursday. First-time members are warmly invited.",
                    "author": leader_user,
                    "is_pinned": True,
                }
            )

            ClubMessage.objects.get_or_create(
                club=robotics_club,
                sender=leader_user,
                content="Hey everyone! Autonomous navigation stack code is pushed to our GitHub repo.",
                defaults={"created_at": now - timedelta(hours=3)}
            )
            ClubMessage.objects.get_or_create(
                club=robotics_club,
                sender=student_user,
                content="Awesome! I just tested the LIDAR simulation in Gazebo and it works cleanly.",
                defaults={"created_at": now - timedelta(hours=2)}
            )

            # ------------------------------------------------------------------
            # 8. Event Q&A Discussions
            # ------------------------------------------------------------------
            self.stdout.write("Seeding event questions, upvotes, and official answers...")

            q1, _ = EventQuestion.objects.get_or_create(
                event=hackathon,
                author=student_user,
                content="Are hardware kits provided for IoT tracks, or should teams bring their own microcontrollers?",
                defaults={"is_pinned": True}
            )
            EventQuestionUpvote.objects.get_or_create(question=q1, user=peer1)
            EventQuestionUpvote.objects.get_or_create(question=q1, user=peer2)

            EventAnswer.objects.get_or_create(
                question=q1,
                author=leader_user,
                defaults={
                    "content": "We have 50 ESP32-S3 and Raspberry Pi 5 developer kits available for checkout at the registration desk!",
                    "is_official": True,
                }
            )

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully!"))
        self.stdout.write("\nDocumented Demo Credentials:")
        self.stdout.write("  Student:       student@campushub.edu       / CampusDemo2026!")
        self.stdout.write("  Club Leader:   leader@campushub.edu        / CampusDemo2026!")
        self.stdout.write("  Administrator: admin@campushub.edu         / CampusDemo2026!")
