# KPRIT CampusHub — Production Readiness Checklist

**Target College:** Kommuri Pratap Reddy Institute of Technology (KPRIT)  
**Evaluation Standard:** Production Pilot Audit (Phase 7 Hardening)  
**Status Legend:**
- **`READY`**: Code, schema, tests, and configuration fully implemented and verified.
- **`BLOCKED`**: Hard blockers requiring resolution before moving to pilot.
- **`REQUIRES KPRIT IT`**: Infrastructure, credentials, or domain assets that must be provided by the college IT department.
- **`REQUIRES ADMIN DECISION`**: Institutional policy decisions that must be determined by college leadership (Principal / Dean / TPO Head).

---

## Comprehensive Readiness Matrix

| Domain | Item | Status | Verification & Evidence | Action Required |
| :--- | :--- | :---: | :--- | :--- |
| **Authentication** | JWT Authentication with Token Rotation | **`READY`** | Verified via SimpleJWT blacklist and `/api/auth/token/refresh/`. | None. |
| **Authentication** | Domain Restriction (`@kpritech.ac.in`) | **`READY`** | Validated in `RegisterSerializer` and `import_kprit_roster`. | Set `ALLOWED_STUDENT_EMAIL_DOMAINS` in production `.env`. |
| **Authentication** | Password Reset via Signed Tokens | **`READY`** | End-to-end unit tests passed (`test_password_reset_workflow_end_to_end`). | Requires institutional SMTP server for production dispatch. |
| **Authentication** | Google Workspace / College SSO | **`REQUIRES KPRIT IT`** | Standard OAuth client ID and institutional Google Workspace admin delegation needed. | College IT to register OAuth credentials if direct Google SSO is desired. |
| **RBAC** | Centralized 7-Tier Permission Matrix | **`READY`** | Implemented in `users/permissions.py` with 14 automated unit tests. | None. |
| **RBAC** | Server-Side Enforcement (No Frontend Trust) | **`READY`** | Verified in browser QA and unit tests: Student attempting admin API gets 403. | None. |
| **RBAC** | Privilege Escalation Immunity | **`READY`** | Verified via `test_student_cannot_elevate_role_via_me_patch`. Role immutable via API. | None. |
| **Database** | Schema Migrations (`0002` + `0008`) | **`READY`** | Applied cleanly without data loss. Foreign keys and indexes intact. | None. |
| **Database** | Production PostgreSQL Config | **`READY`** | `DATABASE_URL` parsing with connection pooling and health checks configured. | College IT to supply production PostgreSQL 15+ credentials. |
| **Database** | Database-Driven Placement Eligibility | **`READY`** | Validated via `test_student_cannot_apply_when_ineligible`. Zero mock logic. | TPO Head to set CGPA and backlog thresholds per drive. |
| **Redis** | WebSocket Channel Layer Integration | **`READY`** | Configured with `channels_redis` and `REDIS_URL`. Degrades safely to in-memory if offline. | Deploy Redis 7 container or managed cluster in production. |
| **Redis** | Unnecessary Background Complexity Avoided | **`READY`** | Direct asynchronous ASGI/Channels used without unnecessary Celery baggage. | None. |
| **Email** | Institutional SMTP Gateway Config | **`REQUIRES KPRIT IT`** | Django email backend configured to read `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`. | College IT to supply institutional SMTP relay credentials (`notifications@kpritech.ac.in`). |
| **HTTPS / TLS** | Reverse Proxy Configuration | **`READY`** | Production Nginx configuration generated at `deploy/nginx/campushub.kpritech.ac.in.conf`. | College IT to bind to production server and generate TLS certs via Certbot. |
| **HTTPS / TLS** | SSL Headers & HSTS Preload | **`READY`** | Configured in Django settings (`SECURE_HSTS_SECONDS=31536000`) and Next.js security headers. | Enable `SECURE_SSL_REDIRECT=True` in production. |
| **DNS** | College Subdomain Setup | **`REQUIRES KPRIT IT`** | Domain references: `campushub.kpritech.ac.in` and `api.campushub.kpritech.ac.in`. | College network administrator to map DNS A/CNAME records to server IP. |
| **Backups** | Automated Database Backup Utility | **`READY`** | Implemented in `python manage.py backup_database` with SHA256 checksums and 30-day rotation. | Add cron job entry to execute nightly at 02:00 AM IST. |
| **Backups** | Off-Site Disaster Recovery Storage | **`REQUIRES KPRIT IT`** | Backup files written locally to `backups/`. | College IT to sync `backups/` directory to institutional AWS S3 or off-site NAS. |
| **Monitoring** | System Health Endpoints | **`READY`** | Verified at `/api/health/` and `/api/health/ping/` checking DB latency and channels. | Connect uptime monitor (e.g. UptimeKuma or Prometheus) to `/api/health/`. |
| **Monitoring** | Application Error Tracking | **`REQUIRES KPRIT IT`** | Django verbose logging configured to stdout/syslog. | College IT to configure optional Sentry DSN if cloud error tracking is requested. |
| **Logging** | Tamper-Evident Audit Logging | **`READY`** | Implemented across all administrative operations (role assignment, drive creation, approvals). | None. |
| **Logging** | Secret & PII Masking | **`READY`** | Passwords and JWT tokens excluded from log outputs; passwords hashed with PBKDF2-SHA256. | None. |
| **Data Import** | Batch Student & Faculty CSV Ingestion | **`READY`** | Implemented in `python manage.py import_kprit_roster` with dry-run validation. | College Registrar to provide official student list for Class of 2026 pilot. |
| **Data Import** | Seed Data Segregation | **`READY`** | Seeded development data preserved without conflicts; import script supports atomic upsert. | None. |
| **Admin Provisioning** | Safe CLI Provisioning Engine | **`READY`** | Verified via `python manage.py provision_institutional_user` with mandatory audit trail. | College IT to provision initial Principal and TPO accounts. |
| **Security** | Server-Side Object-Level Permissions | **`READY`** | 14/14 automated security QA tests passing (`campus.tests_security_qa`). | None. |
| **Security** | Cross-Origin (CORS/CSRF) Hardening | **`READY`** | Environment-driven `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`. | Set production domain origins in `.env`. |
| **Security** | Brute-Force Rate Limiting | **`READY`** | DRF throttling configured (`AnonRateThrottle`, `UserRateThrottle`) + Nginx rate zones. | None. |
| **Accessibility** | Form Labels, Contrast & Keyboard Nav | **`READY`** | Verified across all Admin and TPO shells; semantic HTML5 buttons and tables. | None. |
| **Performance** | Database Query Optimization | **`READY`** | `select_related('profile', 'company')` applied across high-frequency endpoints. | None. |
| **Browser QA** | Multi-Role End-to-End Browser Testing | **`READY`** | Super Admin, TPO Admin, and Student workflows tested via Playwright subagent. | None. |
| **Deployment** | Docker & Docker Compose Readiness | **`READY`** | Updated `backend/Dockerfile` with Daphne ASGI server and verified `docker-compose.yml`. | Deploy on college virtual machine or cloud droplet. |
| **Institutional Policy** | Placement Backlog & Eligibility Rules | **`REQUIRES ADMIN DECISION`** | Database fields support dynamic configuration per drive. | TPO Head & Academic Council to finalize official placement criteria. |
| **Institutional Policy** | Club Constitution & Approval Authority | **`REQUIRES ADMIN DECISION`** | Approval Center routes pending clubs to Dean/Principal. | Principal to confirm whether HOD or Dean has final club sign-off authority. |

---

## Summary of Action Items Before Live Pilot Launch

### Tier 1: KPRIT IT Department Requirements (Infrastructure)
1. Provide DNS A records pointing `campushub.kpritech.ac.in` and `api.campushub.kpritech.ac.in` to the production host server.
2. Provide institutional SMTP server credentials (`notifications@kpritech.ac.in`) for automated email delivery.
3. Provision a production virtual machine or container host with Ubuntu 22.04 LTS, Docker, PostgreSQL 15+, and Redis 7.

### Tier 2: College Academic Administration Requirements (Data & Policy)
1. Provide verified CSV export of Class of 2026 students (CSE cohort) for Stage 3 pilot ingestion.
2. Confirm initial placement policies (minimum CGPA cutoffs, maximum active backlogs permitted per company tier).
3. Execute `python manage.py provision_institutional_user` to establish official credentials for Principal and TPO Head.
