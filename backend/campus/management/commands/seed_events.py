from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import User, StudentProfile
from campus.models import Club, Event, EventRSVP, Announcement


class Command(BaseCommand):
    help = "Seeds initial clubs, events, and sample announcements for CampusHub."

    def handle(self, *args, **options):
        self.stdout.write("Seeding CampusHub database...")

        # 1. Create or get Admin
        admin_user, _ = User.objects.get_or_create(
            email="admin@state.edu",
            defaults={
                "full_name": "Campus Administrator",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
            }
        )
        if not admin_user.has_usable_password():
            admin_user.set_password("AdminPass123!")
            admin_user.save()

        # 2. Create or get Club Leader
        leader_user, _ = User.objects.get_or_create(
            email="maya.leader@state.edu",
            defaults={
                "full_name": "Maya Lin",
                "role": "club_leader",
            }
        )
        if not leader_user.has_usable_password():
            leader_user.set_password("LeaderPass123!")
            leader_user.save()
        StudentProfile.objects.get_or_create(
            user=leader_user,
            defaults={
                "student_id": "STU-1020",
                "department": "Computer Science",
                "graduation_year": 2027,
            }
        )

        # 3. Create or get Demo Student
        student_user, _ = User.objects.get_or_create(
            email="alex.student@state.edu",
            defaults={
                "full_name": "Alex Student",
                "role": "student",
            }
        )
        if not student_user.has_usable_password():
            student_user.set_password("Password123!")
            student_user.save()
        StudentProfile.objects.get_or_create(
            user=student_user,
            defaults={
                "student_id": "STU-9921",
                "department": "Software Engineering",
                "graduation_year": 2028,
            }
        )

        # 4. Create Clubs
        clubs_data = [
            {
                "name": "ACM Student Chapter",
                "slug": "acm-chapter",
                "category": "Technology",
                "description": "Weekly algorithmic coding sessions, tech talk speaker series, and premier hackathons.",
                "leader": leader_user,
                "meeting_schedule": "Wednesdays @ 6:00 PM",
                "location": "Turing Engineering Hall, Room 302",
                "accent_color": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
                "tags": ["Coding", "Algorithms", "Career Prep"],
            },
            {
                "name": "Autonomous Robotics Lab",
                "slug": "robotics-lab",
                "category": "STEM",
                "description": "Interdisciplinary engineering team designing combat robots and autonomous drones.",
                "leader": leader_user,
                "meeting_schedule": "Tuesdays & Thursdays @ 5:30 PM",
                "location": "Robotics Innovation Center",
                "accent_color": "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
                "tags": ["Hardware", "ROS2", "Robotics"],
            },
            {
                "name": "Collegiate Debating Union",
                "slug": "debate-union",
                "category": "Leadership",
                "description": "Competitive British Parliamentary debate society competing nationally across North America.",
                "leader": admin_user,
                "meeting_schedule": "Mondays @ 7:00 PM",
                "location": "Student Commons Atrium",
                "accent_color": "bg-amber-500/10 text-amber-500 border-amber-500/20",
                "tags": ["Public Speaking", "Policy", "Competitions"],
            },
            {
                "name": "Campus Film & Photography Society",
                "slug": "film-photo-soc",
                "category": "Creative Arts",
                "description": "Studio darkrooms, cinema screening nights, and festival showcases for visual creators.",
                "leader": leader_user,
                "meeting_schedule": "Fridays @ 4:30 PM",
                "location": "Fine Arts Media Center",
                "accent_color": "bg-purple-500/10 text-purple-500 border-purple-500/20",
                "tags": ["Photography", "Cinematography", "Creative"],
            },
            {
                "name": "EcoCampus Sustainability Initiative",
                "slug": "ecocampus",
                "category": "Volunteering",
                "description": "Managing the student organic garden and campus zero-waste initiatives.",
                "leader": leader_user,
                "meeting_schedule": "Saturdays @ 10:00 AM",
                "location": "Campus Greenhouse & Gardens",
                "accent_color": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                "tags": ["Ecology", "Gardening", "Zero Waste"],
            },
        ]

        created_clubs = {}
        for cdata in clubs_data:
            club, _ = Club.objects.get_or_create(slug=cdata["slug"], defaults=cdata)
            created_clubs[club.slug] = club

        # 5. Create Events
        now = timezone.now()
        events_data = [
            {
                "club": created_clubs["acm-chapter"],
                "title": "HackCampus 2026: 36-Hour Hackathon",
                "category": "Tech",
                "description": "Join over 300 student innovators building solutions for campus automation, AI tools, and sustainability. $5,000 in prizes and mentorship from alumni tech leaders.",
                "location": "Engineering Complex & Online",
                "start_time": now + timedelta(days=5, hours=2),
                "end_time": now + timedelta(days=6, hours=14),
                "capacity": 250,
                "featured": True,
                "image_gradient": "from-indigo-600 to-blue-700",
                "tags": ["Hackathon", "AI", "Prizes", "Open to All"],
                "is_published": True,
                "created_by": leader_user,
            },
            {
                "club": created_clubs["acm-chapter"],
                "title": "Fall Career Fair & Alumni Tech Networking",
                "category": "Career",
                "description": "Connect with 50+ engineering and software employers hiring for Summer 2027 internships and new grad opportunities. Business casual attire recommended.",
                "location": "Grand Ballroom, Student Center",
                "start_time": now + timedelta(days=9, hours=3),
                "end_time": now + timedelta(days=9, hours=9),
                "capacity": 500,
                "featured": True,
                "image_gradient": "from-amber-600 to-orange-700",
                "tags": ["Career", "Internships", "Networking"],
                "is_published": True,
                "created_by": leader_user,
            },
            {
                "club": created_clubs["robotics-lab"],
                "title": "Intro to Autonomous Drones & ROS2",
                "category": "Tech",
                "description": "Hands-on technical workshop exploring robotic operating systems (ROS2), LiDAR sensors, and autonomous quadcopter navigation.",
                "location": "Robotics Lab, Room 310",
                "start_time": now + timedelta(days=12, hours=1),
                "end_time": now + timedelta(days=12, hours=3),
                "capacity": 40,
                "featured": False,
                "image_gradient": "from-cyan-600 to-teal-700",
                "tags": ["Robotics", "ROS2", "Hands-on"],
                "is_published": True,
                "created_by": leader_user,
            },
            {
                "club": created_clubs["film-photo-soc"],
                "title": "Starlight Autumn Film Screening & Discussion",
                "category": "Arts",
                "description": "An evening of student-produced short films, documentary spotlights, and indie cinema followed by a director panel and Q&A.",
                "location": "Starlight Hall Auditorium",
                "start_time": now + timedelta(days=15, hours=4),
                "end_time": now + timedelta(days=15, hours=7),
                "capacity": 150,
                "featured": False,
                "image_gradient": "from-violet-600 to-purple-800",
                "tags": ["Film", "Cinema", "Screening"],
                "is_published": True,
                "created_by": leader_user,
            },
            {
                "club": created_clubs["debate-union"],
                "title": "Campus Parliamentary Debate Championship",
                "category": "Academic",
                "description": "Annual open university debate tournament featuring teams across four divisions discussing technology ethics and global economy.",
                "location": "Humanities Complex Hall A",
                "start_time": now + timedelta(days=18, hours=2),
                "end_time": now + timedelta(days=19, hours=8),
                "capacity": 80,
                "featured": False,
                "image_gradient": "from-rose-600 to-pink-700",
                "tags": ["Debate", "Public Speaking", "Tournament"],
                "is_published": True,
                "created_by": admin_user,
            },
            {
                "club": created_clubs["ecocampus"],
                "title": "Spring Lawn Planting & Zero-Waste Workshop",
                "category": "Social",
                "description": "Get hands-on in the student organic garden! Learn permaculture basics and composting methods, with free herbal teas and produce giveaways.",
                "location": "North Quad Green & Greenhouse",
                "start_time": now + timedelta(days=21, hours=1),
                "end_time": now + timedelta(days=21, hours=5),
                "capacity": 100,
                "featured": False,
                "image_gradient": "from-emerald-600 to-teal-800",
                "tags": ["Social", "Gardening", "Free Snacks"],
                "is_published": True,
                "created_by": leader_user,
            },
        ]

        for edata in events_data:
            Event.objects.get_or_create(
                title=edata["title"],
                defaults=edata
            )

        # 6. Sample Initial RSVP
        first_event = Event.objects.first()
        if first_event:
            EventRSVP.objects.get_or_create(
                event=first_event,
                user=student_user,
                defaults={"status": "attending"}
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded CampusHub events and clubs!"))
