from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from users.models import User, StudentProfile, FacultyProfile
from campus.models import (
    Department,
    Company,
    PlacementDrive,
    Opportunity,
    SystemSetting,
    AuditLog,
    Club,
    Event,
    Announcement,
)


class Command(BaseCommand):
    help = "Seeds initial KPRIT institutional data: Departments, Roles, System Settings, TPO Drives, and Opportunities."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Initializing KPRIT institutional data seeding..."))

        # 1. System Settings
        settings_data = [
            ("institution_profile", {
                "name": "Kommuri Pratap Reddy Institute of Technology",
                "short_name": "KPRIT",
                "code": "KPRIT",
                "affiliation": "Affiliated to JNTU Hyderabad, Approved by AICTE, Accredited by NAAC A+",
                "address": "Near NTPC Power Grid, Edulabad, Ghatkesar, Medchal-Malkajgiri, Hyderabad, Telangana 501301",
                "contact_email": "info@kpritech.ac.in",
                "website": "https://kpritech.ac.in",
                "academic_year": "2025-2026",
                "active_semester": "II Semester",
                "placement_season_active": True,
                "allow_student_registrations": True,
            }, "Official institutional configuration and academic metadata"),
            ("notification_banner", {
                "active": True,
                "message": "Welcome to the official KPRIT Institutional Campus Portal. TPO 2026 Placement Registration is now open.",
                "type": "info"
            }, "Global campus announcement alert banner"),
        ]

        for key, value, desc in settings_data:
            SystemSetting.objects.update_or_create(
                key=key,
                defaults={"value": value, "description": desc}
            )
        self.stdout.write(self.style.SUCCESS("[OK] System settings seeded."))

        # 2. Departments
        departments = [
            ("CSE", "Computer Science & Engineering", "Dr. K. S. Rao", "hod.cse@kpritech.ac.in", "Core computing, software engineering, algorithms and systems."),
            ("ECE", "Electronics & Communication Engineering", "Dr. V. Lakshmi", "hod.ece@kpritech.ac.in", "Signal processing, VLSI design, embedded systems, and wireless communications."),
            ("CSM", "CSE (Artificial Intelligence & Machine Learning)", "Dr. M. Sridhar", "hod.csm@kpritech.ac.in", "Deep learning, neural architectures, data intelligence, and autonomous systems."),
            ("CSD", "CSE (Data Science)", "Dr. P. Anuradha", "hod.csd@kpritech.ac.in", "Big data engineering, statistical learning, and predictive analytics."),
            ("EEE", "Electrical & Electronics Engineering", "Dr. N. Ramesh", "hod.eee@kpritech.ac.in", "Power electronics, smart grid engineering, and renewable energy."),
            ("MECH", "Mechanical Engineering", "Dr. S. K. Verma", "hod.mech@kpritech.ac.in", "Thermodynamics, robotics, CAD/CAM, and advanced manufacturing."),
            ("CIVIL", "Civil Engineering", "Dr. G. Prasad", "hod.civil@kpritech.ac.in", "Structural mechanics, environmental engineering, and sustainable infrastructure."),
            ("MBA", "Master of Business Administration", "Dr. R. Shalini", "hod.mba@kpritech.ac.in", "Corporate strategy, financial engineering, analytics, and marketing."),
            ("H&S", "Humanities & Sciences", "Dr. B. Raman", "hod.hs@kpritech.ac.in", "Foundational mathematics, physics, chemistry, and professional communication."),
        ]

        for code, name, hod, email, desc in departments:
            Department.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "hod_name": hod,
                    "contact_email": email,
                    "description": desc,
                    "is_active": True,
                }
            )
        self.stdout.write(self.style.SUCCESS("[OK] KPRIT Academic Departments seeded."))

        # 3. Institutional Role Accounts (Password: Kprit@2026)
        staff_accounts = [
            ("superadmin@kpritech.ac.in", "Dr. K. P. Reddy", "super_admin", "KPR-DIR-001", "Administration", "Director & Chairman", True),
            ("principal@kpritech.ac.in", "Dr. S. R. Krishna", "college_admin", "KPR-PRN-002", "Administration", "Principal", True),
            ("tpo@kpritech.ac.in", "Prof. Rajesh Varma", "tpo_admin", "KPR-TPO-003", "Training & Placement", "Head of Training & Placements", False),
            ("hod.cse@kpritech.ac.in", "Dr. K. S. Rao", "department_admin", "KPR-FAC-101", "CSE", "Professor & Head of Department", False),
            ("faculty.ece@kpritech.ac.in", "Dr. V. Lakshmi", "faculty", "KPR-FAC-201", "ECE", "Associate Professor", False),
            ("club.coordinator@kpritech.ac.in", "Prof. Ananya Sen", "club_coordinator", "KPR-FAC-301", "CSE", "Assistant Professor & Student Affairs Coordinator", False),
        ]

        for email, full_name, role, emp_id, dept, designation, is_superuser in staff_accounts:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "full_name": full_name,
                    "role": role,
                    "is_staff": role in ('super_admin', 'college_admin', 'admin'),
                    "is_superuser": is_superuser,
                }
            )
            user.set_password("Kprit@2026")
            user.role = role
            user.full_name = full_name
            user.is_staff = role in ('super_admin', 'college_admin', 'admin') or is_superuser
            user.is_superuser = is_superuser
            user.save()

            FacultyProfile.objects.update_or_create(
                user=user,
                defaults={
                    "employee_id": emp_id,
                    "department": dept,
                    "designation": designation,
                    "specialization": "Institutional Leadership & Engineering",
                    "contact_phone": "+91 98490 00000",
                }
            )

        self.stdout.write(self.style.SUCCESS("[OK] Institutional staff accounts seeded."))

        # 4. Companies for TPO
        tpo_user = User.objects.get(email="tpo@kpritech.ac.in")
        companies_data = [
            ("Darwinbox Technologies", "Enterprise SaaS & HRTech", "Super Dream", "https://darwinbox.com", "Hyderabad / Bangalore", "Pooja Sharma", "campus@darwinbox.io"),
            ("Infosys Limited", "Information Technology & Consulting", "Dream", "https://infosys.com", "Bangalore / Hyderabad", "Amit Mukherjee", "careers@infosys.com"),
            ("Tata Consultancy Services", "IT Services & Solutions", "Tier 1", "https://tcs.com", "Pan India", "Ritu Sengupta", "campus.tcs@tcs.com"),
            ("Cognizant Technology Solutions", "Digital Transformation", "Tier 1", "https://cognizant.com", "Hyderabad / Chennai", "Karthik Raja", "campus@cognizant.com"),
            ("Virtusa Consulting", "Cloud & Digital Engineering", "Tier 2", "https://virtusa.com", "Hyderabad", "Neha Kapoor", "graduates@virtusa.com"),
        ]

        companies = {}
        for name, ind, tier, web, loc, c_name, c_email in companies_data:
            comp, _ = Company.objects.update_or_create(
                name=name,
                defaults={
                    "industry": ind,
                    "tier": tier,
                    "website": web,
                    "location": loc,
                    "contact_person": c_name,
                    "contact_email": c_email,
                    "is_active": True,
                }
            )
            companies[name] = comp
        self.stdout.write(self.style.SUCCESS("[OK] TPO Companies seeded."))

        # 5. Placement Drives
        now = timezone.now()
        drives_data = [
            (
                companies["Darwinbox Technologies"],
                "Software Development Engineer (SDE-1)",
                "Full-stack product engineering role building high-throughput microservices in Go and React.",
                14.00,
                now + timedelta(days=25),
                now + timedelta(days=12),
                8.00,
                0,
                ["CSE", "CSM", "CSD", "IT"],
                2026,
                "KPRIT Campus Auditorium & Online Coding Assessment"
            ),
            (
                companies["Infosys Limited"],
                "Specialist Programmer (SP) & Digital Specialist Engineer (DSE)",
                "Advanced technology track focusing on Cloud, AI/ML engineering, and enterprise architecture.",
                9.50,
                now + timedelta(days=35),
                now + timedelta(days=18),
                7.00,
                1,
                ["CSE", "ECE", "CSM", "CSD", "EEE"],
                2026,
                "Virtual Drive via Infosys Springboard"
            ),
            (
                companies["Tata Consultancy Services"],
                "TCS Digital & Ninja Engineering Drive 2026",
                "Flagship national recruitment for software development, system design, and AI automation.",
                7.20,
                now + timedelta(days=45),
                now + timedelta(days=20),
                6.50,
                0,
                ["CSE", "ECE", "CSM", "CSD", "EEE", "MECH", "CIVIL"],
                2026,
                "KPRIT Main Computing Centre Labs"
            ),
            (
                companies["Cognizant Technology Solutions"],
                "GenC Elevate & Next-Gen Developer",
                "Full-stack and cloud application engineering across global client digital projects.",
                4.50,
                now + timedelta(days=50),
                now + timedelta(days=28),
                6.00,
                2,
                ["CSE", "ECE", "CSM", "CSD", "EEE", "MECH"],
                2026,
                "Online Assessment + KPRIT Placement Hall"
            ),
        ]

        for comp, role, desc, lpa, d_date, deadline, min_cgpa, max_bl, depts, grad_yr, venue in drives_data:
            PlacementDrive.objects.update_or_create(
                company=comp,
                job_role=role,
                defaults={
                    "title": f"{comp.name} — {role}",
                    "job_description": desc,
                    "package_lpa": lpa,
                    "drive_date": d_date,
                    "application_deadline": deadline,
                    "eligibility_min_cgpa": min_cgpa,
                    "eligibility_max_backlogs": max_bl,
                    "eligibility_departments": depts,
                    "eligibility_graduation_year": grad_yr,
                    "status": "active",
                    "venue_or_link": venue,
                    "created_by": tpo_user,
                }
            )
        self.stdout.write(self.style.SUCCESS("[OK] Placement Drives seeded."))

        # 6. Opportunities (Internships, Hackathons, Scholarships)
        opps_data = [
            (
                "Smart India Hackathon (SIH 2026) - KPRIT Campus Prelims",
                "Ministry of Education & AICTE",
                "hackathon",
                "Internal college evaluation round for national software and hardware editions. Top 10 teams represent KPRIT.",
                "KPRIT Seminar Hall",
                "₹1,00,000 National Prize",
                now + timedelta(days=15),
                "https://sih.gov.in",
                "All B.Tech batches welcome. Teams of 6 with at least one female candidate required.",
                "CSE"
            ),
            (
                "AWS Cloud Architect Summer Internship 2026",
                "Amazon Web Services",
                "internship",
                "Hands-on immersion with serverless cloud infrastructure, distributed microservices, and CDK deployments.",
                "Hyderabad (Hybrid)",
                "₹45,00, Month",
                now + timedelta(days=22),
                "https://amazon.jobs",
                "Pre-final and final year students with Linux and Python/TypeScript foundations.",
                "CSE"
            ),
            (
                "Pragati & Saksham Technical Education Scholarships",
                "AICTE & Government of Telangana",
                "scholarship",
                "Direct institutional scholarship for meritorious female and differently-abled engineering scholars.",
                "State Portal",
                "₹50,000 Per Annum",
                now + timedelta(days=40),
                "https://scholarships.gov.in",
                "Valid for 1st to 4th year eligible students. Income certificate required.",
                "All"
            ),
            (
                "NPTEL & Swayam Elite Certification Reimbursement",
                "KPRIT Academic Council",
                "certification",
                "100% exam fee reimbursement for students completing NPTEL courses with Elite or Gold certifications.",
                "KPRIT Academic Section",
                "Full Fee Refund",
                now + timedelta(days=60),
                "https://nptel.ac.in",
                "Open to all enrolled students with minimum 75% score on official proctored exams.",
                "All"
            ),
        ]

        for title, org, o_type, desc, loc, prize, deadl, url, elig, dept in opps_data:
            Opportunity.objects.update_or_create(
                title=title,
                defaults={
                    "organization": org,
                    "opportunity_type": o_type,
                    "description": desc,
                    "location": loc,
                    "stipend_or_prize": prize,
                    "deadline": deadl,
                    "apply_url": url,
                    "eligibility_criteria": elig,
                    "department": dept,
                    "status": "published",
                    "created_by": tpo_user,
                }
            )
        self.stdout.write(self.style.SUCCESS("[OK] Institutional Opportunities seeded."))

        # 7. Audit Log Entry
        AuditLog.objects.create(
            actor=User.objects.get(email="superadmin@kpritech.ac.in"),
            action="SYSTEM_INIT",
            resource_type="KPRIT_PLATFORM",
            resource_id="1",
            details={"message": "KPRIT Institutional RBAC & Academic Platform baseline seeded."},
            ip_address="127.0.0.1",
        )

        self.stdout.write(self.style.SUCCESS("[OK] KPRIT Seeding completed successfully!"))
