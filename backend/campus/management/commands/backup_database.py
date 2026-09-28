import os
import shutil
import hashlib
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from campus.models import AuditLog


class Command(BaseCommand):
    help = (
        "Automated institutional database backup utility for KPRIT CampusHub. "
        "Supports PostgreSQL (pg_dump) and SQLite, integrity checksums, and retention rotation."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            default='',
            help='Directory path where backup archives will be stored (defaults to BASE_DIR/backups)'
        )
        parser.add_argument(
            '--retention-days',
            type=int,
            default=30,
            help='Number of days to retain historical backups before automatic rotation (default: 30)'
        )

    def handle(self, *args, **options):
        base_dir = settings.BASE_DIR
        out_dir_str = options.get('output_dir') or str(base_dir / 'backups')
        backup_dir = Path(out_dir_str)
        backup_dir.mkdir(parents=True, exist_ok=True)

        retention_days = options.get('retention_days')
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        db_config = settings.DATABASES['default']
        engine = db_config.get('ENGINE', '')

        self.stdout.write(self.style.SUCCESS(f"\n=================================================="))
        self.stdout.write(self.style.SUCCESS(f"  KPRIT DATABASE BACKUP SUBSYSTEM"))
        self.stdout.write(self.style.SUCCESS(f"  Engine: {engine} | Target: {backup_dir}"))
        self.stdout.write(self.style.SUCCESS(f"==================================================\n"))

        backup_file = None

        if 'sqlite3' in engine:
            db_path = Path(db_config['NAME'])
            if not db_path.exists():
                self.stderr.write(self.style.ERROR(f"Error: SQLite database file not found at {db_path}"))
                return

            backup_file = backup_dir / f"kprit_campushub_backup_{timestamp}.sqlite3"
            shutil.copy2(db_path, backup_file)
            file_size_mb = backup_file.stat().st_size / (1024 * 1024)

        elif 'postgresql' in engine:
            db_name = db_config.get('NAME')
            user = db_config.get('USER')
            host = db_config.get('HOST', 'localhost')
            port = str(db_config.get('PORT', '5432'))
            password = db_config.get('PASSWORD', '')

            backup_file = backup_dir / f"kprit_campushub_backup_{timestamp}.sql"

            env = os.environ.copy()
            if password:
                env['PGPASSWORD'] = password

            cmd = [
                'pg_dump',
                '-h', host,
                '-p', port,
                '-U', user,
                '-d', db_name,
                '-F', 'c',  # Custom compressed format
                '-f', str(backup_file)
            ]

            try:
                res = subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)
                file_size_mb = backup_file.stat().st_size / (1024 * 1024)
            except (subprocess.CalledProcessError, FileNotFoundError) as err:
                self.stderr.write(self.style.ERROR(
                    f"PostgreSQL backup failed or pg_dump not installed: {err}\n"
                    f"Ensure pg_dump client tools are installed on host system."
                ))
                return
        else:
            self.stderr.write(self.style.ERROR(f"Unsupported database engine: {engine}"))
            return

        # Calculate SHA256 checksum
        hasher = hashlib.sha256()
        with open(backup_file, 'rb') as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        checksum = hasher.hexdigest()

        # Write metadata sidecar file
        meta_file = backup_dir / f"{backup_file.name}.meta"
        with open(meta_file, 'w', encoding='utf-8') as f:
            f.write(f"Backup File: {backup_file.name}\n")
            f.write(f"Created: {datetime.now(timezone.utc).isoformat()}\n")
            f.write(f"Size MB: {file_size_mb:.2f}\n")
            f.write(f"SHA256: {checksum}\n")
            f.write(f"Engine: {engine}\n")

        # Rotate old backups
        rotated_count = 0
        now_ts = datetime.now().timestamp()
        for f in backup_dir.glob("kprit_campushub_backup_*"):
            if f.is_file():
                age_days = (now_ts - f.stat().st_mtime) / (24 * 3600)
                if age_days > retention_days:
                    f.unlink(missing_ok=True)
                    rotated_count += 1

        # Audit log entry
        try:
            AuditLog.objects.create(
                action='DATABASE_BACKUP',
                resource_type='Database',
                resource_id=backup_file.name,
                details={
                    'filename': backup_file.name,
                    'size_mb': round(file_size_mb, 2),
                    'sha256': checksum,
                    'retention_rotated_files': rotated_count,
                }
            )
        except Exception:
            pass

        self.stdout.write(self.style.SUCCESS(f"[OK] Database Backup Completed Successfully:"))
        self.stdout.write(f"  File:       {backup_file.name}")
        self.stdout.write(f"  Location:   {backup_file}")
        self.stdout.write(f"  Size:       {file_size_mb:.2f} MB")
        self.stdout.write(f"  SHA256:     {checksum}")
        self.stdout.write(f"  Retention:  Rotated {rotated_count} historical files older than {retention_days} days.\n")
