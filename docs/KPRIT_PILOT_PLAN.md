# KPRIT CampusHub — Institutional Pilot & Rollout Plan

**Institution:** Kommuri Pratap Reddy Institute of Technology (KPRIT), Hyderabad  
**Document Version:** 1.0 (Phase 7 Production Hardening)  
**Target Architecture:** Multi-Role Institutional Campus OS (Next.js + Django Channels + PostgreSQL)

---

## 1. Pilot Objectives
1. Validate role boundaries and administrative workflows with real academic leaders (Principal, Dean, TPO, HODs).
2. Verify automated placement eligibility rules with actual recruitment drives (Darwinbox, Infosys, TCS, Cognizant).
3. Test event check-in, QR ticketing, and club approval state machines under controlled concurrency.
4. Establish operational feedback loops with KPRIT IT services without risking unmonitored college-wide deployment.

---

## 2. Six-Stage Controlled Rollout Schedule

```
+--------------------------------------------------------------------------+
|  Stage 1: Central Leadership & TPO (Weeks 1-2)                           |
|  - Principal / Dean / TPO Officer / IT Administrator                     |
+------------------------------------+-------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|  Stage 2: Single Department Pilot (Weeks 3-4)                            |
|  - CSE Department: HOD + 15 Faculty Members                              |
+------------------------------------+-------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|  Stage 3: Limited Student Cohort (Weeks 5-6)                             |
|  - CSE Final Year (Class of 2026, Section A & B: ~120 Students)          |
+------------------------------------+-------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|  Stage 4: Feedback, Auditing & Calibration (Week 7)                      |
|  - Bug remediation, performance profiling, eligibility policy tuning     |
+------------------------------------+-------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|  Stage 5: Multi-Department Expansion (Weeks 8-10)                        |
|  - ECE, CSM (AI & ML), CSD (Data Science)                                |
+------------------------------------+-------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|  Stage 6: College-Wide General Availability (Weeks 11+)                  |
|  - All 9 Departments: EEE, MECH, CIVIL, MBA, H&S (~2,500+ Students)     |
+--------------------------------------------------------------------------+
```

---

## 3. Detailed Stage Breakdown

### Stage 1: Central College Leadership & TPO Placement Cell
- **Participants**: Principal (`COLLEGE_ADMIN`), TPO Head (`TPO_ADMIN`), System Administrator (`SUPER_ADMIN`).
- **Scope & Actions**:
  - Provision administrative credentials via `python manage.py provision_institutional_user`.
  - Validate College Dashboard KPIs, department registry, and global system settings (`academic_year: 2025-2026`, `placement_season: active`).
  - Configure recruiting company masters (Darwinbox, TCS, Infosys, Cognizant, Virtusa).
  - Draft and publish initial placement drive contracts with database-driven eligibility rules.
- **Success Criteria**:
  - Zero critical errors on `/admin/dashboard` and `/tpo/dashboard`.
  - All published drives reflect accurate eligibility criteria (CGPA, backlogs, branch).
  - Audit logs record all administrative setup mutations.

### Stage 2: Single Department Academic Onboarding (CSE)
- **Participants**: HOD Computer Science (`DEPARTMENT_ADMIN`), CSE Faculty Advisors, Club Faculty Coordinators.
- **Scope & Actions**:
  - Ingest CSE faculty roster using `python manage.py import_kprit_roster --file cse_faculty.csv --type faculty`.
  - HOD reviews and approves pending technical society proposals (ACM, CSI Student Chapter).
  - Faculty draft and test department announcements and workshop event listings.
- **Success Criteria**:
  - Department HOD can only view and manage CSE departmental records.
  - CSE faculty can draft events and submit them into the Central Approval Center.

### Stage 3: Limited Student Cohort (CSE Class of 2026)
- **Participants**: 120 final-year CSE students (eligible for upcoming campus placement drives).
- **Scope & Actions**:
  - Batch import verified student roll numbers, CGPA, and backlog metrics via `python manage.py import_kprit_roster`.
  - Students authenticate using institutional Google accounts or email credentials (`@kpritech.ac.in`).
  - Students update profiles (resume links, bio) and apply to active placement drives.
  - System enforces database-driven eligibility (rejecting applicants below minimum CGPA with informative error feedback).
  - Students register for campus hackathons and test mobile QR ticket check-ins.
- **Success Criteria**:
  - 100% of ineligible applications rejected at API layer with exact criteria explanation.
  - 100% of eligible applications recorded with candidate CGPA snapshot at application time.
  - Student role strictly prevented from accessing any `/admin/*` or `/tpo/*` administrative endpoints.

### Stage 4: Feedback, Auditing & Calibration
- **Participants**: IT Committee, Student Representatives, Placement Coordinators.
- **Scope & Actions**:
  - Audit query execution times and database performance under peak load.
  - Review `AuditLog` table for unauthorized access attempts or suspicious activity.
  - Calibrate placement cutoff parameters based on departmental review.
  - Patch any reported UI, responsiveness, or accessibility issues.
- **Success Criteria**:
  - Zero unhandled exceptions in production application logs.
  - Database queries respond within `<100ms` for 95th percentile.

### Stage 5: Multi-Department Expansion
- **Participants**: Electronics & Communication (ECE), CSE (AI & ML - CSM), CSE (Data Science - CSD).
- **Scope & Actions**:
  - Ingest ECE, CSM, CSD student rosters and faculty directories.
  - Enable cross-department hackathons and collegiate club memberships.
  - TPO schedules multi-branch interview rounds and publishes shortlist notices.
- **Success Criteria**:
  - Multi-branch placement eligibility correctly handles branch-filtering arrays e.g. `['CSE', 'CSM', 'CSD']`.

### Stage 6: College-Wide General Availability
- **Participants**: All remaining branches: EEE, Mechanical Engineering, Civil Engineering, MBA, Humanities & Sciences.
- **Scope & Actions**:
  - Total student body onboarding (~2,500+ students, 120+ faculty).
  - Broadcast institutional notification system active college-wide.
  - Daily automated database backups scheduled via cron (`python manage.py backup_database`).
- **Success Criteria**:
  - CampusHub operational as primary student campus portal.

---

## 4. Rollback & Emergency Contingency Procedures
1. **Maintenance Mode**:
   - Institutional administrators can toggle `is_maintenance_mode=True` via `/admin/settings` or CLI.
   - Non-administrative requests immediately receive polite institutional maintenance screen.
2. **Database Rollback**:
   - Nightly backup archives stored at `/backups/kprit_campushub_backup_<timestamp>.sql`.
   - Restore executed via:
     ```bash
     pg_restore -h localhost -U campushub_user -d campushub_db -c /backups/kprit_campushub_backup_<timestamp>.sql
     ```
3. **Escalation Contacts**:
   - Primary: KPRIT IT Administrator (`it.admin@kpritech.ac.in`)
   - TPO Cell: Placement Officer (`tpo@kpritech.ac.in`)
   - Academic Operations: Office of Principal (`principal@kpritech.ac.in`)
