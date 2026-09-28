import csv
import os
import sys
from decimal import Decimal, InvalidOperation
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from users.models import User, StudentProfile, FacultyProfile
from campus.models import Department, AuditLog


class Command(BaseCommand):
    help = (
        "Production-grade CSV import and validation engine for official KPRIT student and faculty rosters. "
        "Supports dry-run validation, duplicate detection, and transaction-safe ingestion."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help='Path to the input CSV file containing student or faculty records'
        )
        parser.add_argument(
            '--type',
            type=str,
            choices=['student', 'faculty'],
            default='student',
            help='Record type: "student" or "faculty" (default: "student")'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Perform full validation and duplicate checks without writing changes to the database'
        )
        parser.add_argument(
            '--template',
            action='store_true',
            help='Generate sample CSV roster templates for KPRIT IT department'
        )

    def handle(self, *args, **options):
        if options['template']:
            self.generate_templates()
            return

        file_path = options.get('file')
        if not file_path:
            self.stderr.write(self.style.ERROR("Error: --file argument is required unless using --template."))
            return

        if not os.path.exists(file_path):
            self.stderr.write(self.style.ERROR(f"Error: Specified file does not exist: {file_path}"))
            return

        record_type = options['type']
        dry_run = options['dry_run']

        mode_label = "DRY-RUN (NO CHANGES APPLIED)" if dry_run else "LIVE INGESTION"
        self.stdout.write(self.style.SUCCESS(f"\n=================================================="))
        self.stdout.write(self.style.SUCCESS(f"  KPRIT ROSTER INGESTION ENGINE -- {mode_label}"))
        self.stdout.write(self.style.SUCCESS(f"  Target Entity: {record_type.upper()} | File: {file_path}"))
        self.stdout.write(self.style.SUCCESS(f"==================================================\n"))

        if record_type == 'student':
            self.process_student_roster(file_path, dry_run)
        else:
            self.process_faculty_roster(file_path, dry_run)

    def generate_templates(self):
        """Generates template CSV files for KPRIT IT."""
        student_headers = [
            'roll_number', 'full_name', 'email', 'department_code',
            'graduation_year', 'section', 'cgpa', 'backlogs'
        ]
        student_rows = [
            ['22K81A0501', 'K. Sai Varun', '22k81a0501@kpritech.ac.in', 'CSE', '2026', 'A', '8.45', '0'],
            ['22K81A0502', 'B. Harshitha', '22k81a0502@kpritech.ac.in', 'CSE', '2026', 'B', '7.92', '0'],
            ['22K81A0401', 'P. Rohit Reddy', '22k81a0401@kpritech.ac.in', 'ECE', '2026', 'A', '7.15', '1'],
        ]

        faculty_headers = [
            'employee_id', 'full_name', 'email', 'department_code',
            'designation', 'specialization', 'cabin_location', 'is_hod'
        ]
        faculty_rows = [
            ['KPRIT-CSE-001', 'Dr. K. S. Rao', 'hod.cse@kpritech.ac.in', 'CSE', 'Professor & HOD', 'Computer Vision & AI', 'Block-A, Room 204', 'true'],
            ['KPRIT-ECE-002', 'Dr. V. Lakshmi', 'faculty.ece@kpritech.ac.in', 'ECE', 'Associate Professor', 'VLSI Design & Embedded Systems', 'Block-B, Room 108', 'false'],
        ]

        with open('kprit_student_roster_template.csv', 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(student_headers)
            writer.writerows(student_rows)

        with open('kprit_faculty_roster_template.csv', 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(faculty_headers)
            writer.writerows(faculty_rows)

        self.stdout.write(self.style.SUCCESS("Generated sample templates:"))
        self.stdout.write("  - kprit_student_roster_template.csv")
        self.stdout.write("  - kprit_faculty_roster_template.csv")

    def process_student_roster(self, file_path, dry_run):
        valid_departments = set(Department.objects.values_list('code', flat=True))
        if not valid_departments:
            # Fallback standard KPRIT engineering departments
            valid_departments = {'CSE', 'ECE', 'CSM', 'CSD', 'EEE', 'MECH', 'CIVIL', 'MBA', 'H&S'}

        errors = []
        parsed_records = []
        seen_roll_numbers = set()
        seen_emails = set()

        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            required_cols = {'roll_number', 'full_name', 'email', 'department_code', 'graduation_year'}
            missing_cols = required_cols - set(reader.fieldnames or [])
            if missing_cols:
                self.stderr.write(self.style.ERROR(f"CSV Header Error: Missing required columns: {missing_cols}"))
                return

            for row_idx, row in enumerate(reader, start=2):
                roll_number = (row.get('roll_number') or '').strip().upper()
                full_name = (row.get('full_name') or '').strip()
                email = (row.get('email') or '').strip().lower()
                dept_code = (row.get('department_code') or '').strip().upper()
                grad_year_str = (row.get('graduation_year') or '').strip()
                section = (row.get('section') or '').strip().upper()
                cgpa_str = (row.get('cgpa') or '').strip()
                backlogs_str = (row.get('backlogs') or '0').strip()

                row_errors = []

                # Roll number validation
                if not roll_number:
                    row_errors.append("Roll number is blank.")
                elif roll_number in seen_roll_numbers:
                    row_errors.append(f"Duplicate roll number '{roll_number}' inside CSV file.")
                seen_roll_numbers.add(roll_number)

                # Email validation
                if not email or '@' not in email:
                    row_errors.append("Invalid or missing institutional email address.")
                elif not email.endswith('@kpritech.ac.in'):
                    row_errors.append(f"Email '{email}' must belong to the '@kpritech.ac.in' domain.")
                elif email in seen_emails:
                    row_errors.append(f"Duplicate email '{email}' inside CSV file.")
                seen_emails.add(email)

                # Department validation
                if dept_code not in valid_departments:
                    row_errors.append(f"Invalid department code '{dept_code}'. Valid codes: {sorted(list(valid_departments))}")

                # Graduation year validation
                try:
                    grad_year = int(grad_year_str)
                    if grad_year < 2020 or grad_year > 2035:
                        row_errors.append(f"Graduation year '{grad_year}' out of realistic range (2020-2035).")
                except ValueError:
                    row_errors.append(f"Graduation year '{grad_year_str}' is not a valid integer.")
                    grad_year = None

                # Section validation
                if section and len(section) > 5:
                    row_errors.append(f"Section '{section}' exceeds max length (5 characters).")

                # CGPA validation
                cgpa = None
                if cgpa_str:
                    try:
                        cgpa = Decimal(cgpa_str)
                        if cgpa < 0 or cgpa > 10:
                            row_errors.append(f"CGPA '{cgpa}' must be between 0.00 and 10.00.")
                    except InvalidOperation:
                        row_errors.append(f"CGPA '{cgpa_str}' is not a valid decimal.")

                # Backlogs validation
                backlogs = 0
                if backlogs_str:
                    try:
                        backlogs = int(backlogs_str)
                        if backlogs < 0:
                            row_errors.append(f"Backlogs '{backlogs}' cannot be negative.")
                    except ValueError:
                        row_errors.append(f"Backlogs '{backlogs_str}' is not a valid integer.")

                if row_errors:
                    errors.append((row_idx, roll_number, email, row_errors))
                else:
                    parsed_records.append({
                        'roll_number': roll_number,
                        'full_name': full_name,
                        'email': email,
                        'department_code': dept_code,
                        'graduation_year': grad_year,
                        'section': section,
                        'cgpa': cgpa,
                        'backlogs': backlogs,
                    })

        # Summary of validation
        total_rows = len(parsed_records) + len(errors)
        self.stdout.write(f"Scanned {total_rows} records:")
        self.stdout.write(self.style.SUCCESS(f"  [OK] Valid: {len(parsed_records)}"))
        if errors:
            self.stdout.write(self.style.ERROR(f"  [FAIL] Errors: {len(errors)}"))
            self.stdout.write("\nValidation Issues Detected:")
            for row_idx, r_no, eml, r_errs in errors[:15]:
                self.stderr.write(f"  Line {row_idx} [{r_no or eml}]: {'; '.join(r_errs)}")
            if len(errors) > 15:
                self.stderr.write(f"  ... and {len(errors) - 15} more rows with errors.")

            if not dry_run:
                self.stderr.write(self.style.ERROR("\nImport aborted due to validation errors. Fix errors or use --dry-run."))
                return

        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"\n[DRY RUN COMPLETE] {len(parsed_records)} student records are compliant and ready for import."))
            return

        # Live transaction-atomic ingestion
        created_count = 0
        updated_count = 0
        with transaction.atomic():
            for rec in parsed_records:
                user, created = User.objects.get_or_create(
                    email=rec['email'],
                    defaults={
                        'full_name': rec['full_name'],
                        'role': 'student',
                        'is_active': True,
                    }
                )
                if created:
                    user.set_password('Student@Kprit2026')
                    user.save()
                    created_count += 1
                else:
                    if rec['full_name'] and not user.full_name:
                        user.full_name = rec['full_name']
                        user.save(update_fields=['full_name'])
                    updated_count += 1

                profile, _ = StudentProfile.objects.get_or_create(user=user)
                profile.student_id = rec['roll_number']
                profile.department = rec['department_code']
                profile.graduation_year = rec['graduation_year']
                profile.section = rec['section']
                if rec['cgpa'] is not None:
                    profile.cgpa = rec['cgpa']
                profile.backlogs = rec['backlogs']
                profile.save()

            AuditLog.objects.create(
                action='DATA_IMPORT',
                resource_type='StudentRoster',
                resource_id=f"count:{len(parsed_records)}",
                details={
                    'file': os.path.basename(file_path),
                    'total_records': len(parsed_records),
                    'created_users': created_count,
                    'updated_users': updated_count,
                }
            )

        self.stdout.write(self.style.SUCCESS(
            f"\n[IMPORT COMPLETE] Successfully ingested {len(parsed_records)} students "
            f"({created_count} created, {updated_count} updated)."
        ))

    def process_faculty_roster(self, file_path, dry_run):
        valid_departments = set(Department.objects.values_list('code', flat=True))
        if not valid_departments:
            valid_departments = {'CSE', 'ECE', 'CSM', 'CSD', 'EEE', 'MECH', 'CIVIL', 'MBA', 'H&S'}

        errors = []
        parsed_records = []
        seen_emp_ids = set()
        seen_emails = set()

        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            required_cols = {'employee_id', 'full_name', 'email', 'department_code', 'designation'}
            missing_cols = required_cols - set(reader.fieldnames or [])
            if missing_cols:
                self.stderr.write(self.style.ERROR(f"CSV Header Error: Missing required columns: {missing_cols}"))
                return

            for row_idx, row in enumerate(reader, start=2):
                employee_id = (row.get('employee_id') or '').strip().upper()
                full_name = (row.get('full_name') or '').strip()
                email = (row.get('email') or '').strip().lower()
                dept_code = (row.get('department_code') or '').strip().upper()
                designation = (row.get('designation') or '').strip()
                specialization = (row.get('specialization') or '').strip()
                cabin = (row.get('cabin_location') or '').strip()
                is_hod = (row.get('is_hod') or '').strip().lower() in ('true', '1', 'yes')

                row_errors = []

                if not employee_id:
                    row_errors.append("Employee ID is blank.")
                elif employee_id in seen_emp_ids:
                    row_errors.append(f"Duplicate employee ID '{employee_id}'.")
                seen_emp_ids.add(employee_id)

                if not email or '@' not in email:
                    row_errors.append("Invalid email address.")
                elif not email.endswith('@kpritech.ac.in'):
                    row_errors.append(f"Email '{email}' must belong to '@kpritech.ac.in'.")
                elif email in seen_emails:
                    row_errors.append(f"Duplicate email '{email}'.")
                seen_emails.add(email)

                if dept_code not in valid_departments:
                    row_errors.append(f"Invalid department '{dept_code}'.")

                if not designation:
                    row_errors.append("Designation is required.")

                if row_errors:
                    errors.append((row_idx, employee_id, email, row_errors))
                else:
                    parsed_records.append({
                        'employee_id': employee_id,
                        'full_name': full_name,
                        'email': email,
                        'department_code': dept_code,
                        'designation': designation,
                        'specialization': specialization,
                        'cabin_location': cabin,
                        'is_hod': is_hod,
                    })

        total_rows = len(parsed_records) + len(errors)
        self.stdout.write(f"Scanned {total_rows} faculty records:")
        self.stdout.write(self.style.SUCCESS(f"  [OK] Valid: {len(parsed_records)}"))
        if errors:
            self.stdout.write(self.style.ERROR(f"  [FAIL] Errors: {len(errors)}"))
            for row_idx, e_id, eml, r_errs in errors[:10]:
                self.stderr.write(f"  Line {row_idx} [{e_id or eml}]: {'; '.join(r_errs)}")
            if not dry_run:
                self.stderr.write(self.style.ERROR("Import aborted due to errors."))
                return

        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"\n[DRY RUN COMPLETE] {len(parsed_records)} faculty records are valid."))
            return

        created_count = 0
        updated_count = 0
        with transaction.atomic():
            for rec in parsed_records:
                target_role = 'department_admin' if rec['is_hod'] else 'faculty'
                user, created = User.objects.get_or_create(
                    email=rec['email'],
                    defaults={
                        'full_name': rec['full_name'],
                        'role': target_role,
                        'is_staff': True,
                        'is_active': True,
                    }
                )
                if created:
                    user.set_password('Faculty@Kprit2026')
                    user.save()
                    created_count += 1
                else:
                    if rec['full_name'] and not user.full_name:
                        user.full_name = rec['full_name']
                        user.save(update_fields=['full_name'])
                    updated_count += 1

                profile, _ = FacultyProfile.objects.get_or_create(user=user)
                profile.employee_id = rec['employee_id']
                profile.department = rec['department_code']
                profile.designation = rec['designation']
                profile.specialization = rec['specialization']
                profile.cabin_location = rec['cabin_location']
                profile.is_hod = rec['is_hod']
                profile.save()

            AuditLog.objects.create(
                action='DATA_IMPORT',
                resource_type='FacultyRoster',
                resource_id=f"count:{len(parsed_records)}",
                details={
                    'file': os.path.basename(file_path),
                    'total_records': len(parsed_records),
                    'created_users': created_count,
                    'updated_users': updated_count,
                }
            )

        self.stdout.write(self.style.SUCCESS(
            f"\n[IMPORT COMPLETE] Successfully ingested {len(parsed_records)} faculty members "
            f"({created_count} created, {updated_count} updated)."
        ))
