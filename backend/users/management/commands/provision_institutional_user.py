import secrets
import string
from django.core.management.base import BaseCommand
from django.db import transaction
from users.models import User, FacultyProfile
from campus.models import Department, AuditLog


class Command(BaseCommand):
    help = (
        "Safely provision or promote authorized institutional administrative accounts for KPRIT. "
        "Enforces audit trail logging and prevents unauthorized self-service escalation."
    )

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='Institutional email address (*@kpritech.ac.in)')
        parser.add_argument(
            '--role',
            type=str,
            required=True,
            choices=[
                'super_admin',
                'college_admin',
                'tpo_admin',
                'department_admin',
                'faculty',
                'club_coordinator',
                'student'
            ],
            help='Authorized institutional role'
        )
        parser.add_argument('--full-name', type=str, default='', help='Full name of administrator')
        parser.add_argument('--department', type=str, default='', help='Academic department code (e.g. CSE, ECE)')
        parser.add_argument('--employee-id', type=str, default='', help='Institutional employee ID')
        parser.add_argument('--password', type=str, default='', help='Initial password (auto-generated if omitted)')

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        role = options['role']
        full_name = options['full_name'].strip()
        dept_code = options['department'].strip().upper()
        emp_id = options['employee_id'].strip().upper()
        password = options['password']

        if not email or '@' not in email:
            self.stderr.write(self.style.ERROR("Error: A valid email address is required."))
            return

        # Check department validity if specified
        if dept_code:
            dept_exists = Department.objects.filter(code=dept_code).exists()
            if not dept_exists:
                self.stderr.write(self.style.WARNING(f"Warning: Department code '{dept_code}' is not currently registered."))

        # Generate secure password if not provided
        generated_password = False
        if not password:
            alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
            password = "".join(secrets.choice(alphabet) for _ in range(16))
            generated_password = True

        is_staff_role = role in ['super_admin', 'college_admin', 'tpo_admin', 'department_admin', 'faculty']
        is_superuser_role = (role == 'super_admin')

        with transaction.atomic():
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'full_name': full_name or email.split('@')[0].replace('.', ' ').title(),
                    'role': role,
                    'is_staff': is_staff_role,
                    'is_superuser': is_superuser_role,
                    'is_active': True,
                }
            )

            previous_role = user.role
            user.role = role
            user.is_staff = is_staff_role
            if is_superuser_role:
                user.is_superuser = True
            if full_name:
                user.full_name = full_name
            user.set_password(password)
            user.save()

            # Ensure FacultyProfile exists if faculty/department_admin
            if role in ['faculty', 'department_admin']:
                profile, _ = FacultyProfile.objects.get_or_create(user=user)
                if dept_code:
                    profile.department = dept_code
                if emp_id:
                    profile.employee_id = emp_id
                if role == 'department_admin':
                    profile.is_hod = True
                    profile.designation = 'Professor & Head of Department'
                profile.save()

            # Log to AuditLog
            AuditLog.objects.create(
                actor=user,
                action='USER_ROLE_PROVISION',
                resource_type='User',
                resource_id=str(user.id),
                details={
                    'email': email,
                    'assigned_role': role,
                    'previous_role': previous_role if not created else 'NEW_ACCOUNT',
                    'provisioned_via': 'CLI_MANAGEMENT_COMMAND',
                }
            )

        status_label = "CREATED NEW USER" if created else f"UPDATED EXISTING USER (WAS {previous_role.upper()})"
        self.stdout.write(self.style.SUCCESS(f"\n=================================================="))
        self.stdout.write(self.style.SUCCESS(f"  KPRIT INSTITUTIONAL PROVISIONING -- SUCCESS"))
        self.stdout.write(self.style.SUCCESS(f"=================================================="))
        self.stdout.write(f"  Status:       {status_label}")
        self.stdout.write(f"  User:         {user.full_name} ({user.email})")
        self.stdout.write(f"  Role:         {user.get_role_display()} [{user.role}]")
        self.stdout.write(f"  Staff Access: {user.is_staff}")
        self.stdout.write(f"  Superuser:    {user.is_superuser}")
        if dept_code:
            self.stdout.write(f"  Department:   {dept_code}")
        if emp_id:
            self.stdout.write(f"  Employee ID:  {emp_id}")
        if generated_password:
            self.stdout.write(self.style.WARNING(f"\n  Temporary Generated Password: {password}"))
            self.stdout.write("  Advise user to change password immediately upon initial login.\n")
        else:
            self.stdout.write("  Password set to provided credentials.\n")
