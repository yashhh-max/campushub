# CampusHub Phase 4 Roadmap

## Milestone: Phase 4 — Clubs & Community Hub & Event Waitlist

- [x] **P4.0 — Research & Architecture Alignment**: Inspect existing Club/Event models, user role systems, and frontend components.
- [ ] **P4.1 — Database Models & Migrations**:
  - Extend `Club` with `membership_requires_approval` and `banner_gradient`.
  - Add `ClubMembership` with `role` (member, moderator, vice_president, president), `status` (pending, approved, rejected), and unique `(club, user)` constraint.
  - Add `ClubPost` with `post_type` (announcement, update, discussion), `is_pinned`, and `is_members_only`.
  - Extend `EventRSVP` with `waitlist` status and automatic promotion on cancellation.
- [ ] **P4.2 — Backend Permissions & Serializers**:
  - `IsClubLeaderOrAdmin`, `IsClubMemberOrLeader`, `CanManageClubPost`.
  - `ClubSerializer`, `ClubDetailSerializer`, `ClubMembershipSerializer`, `ClubPostSerializer`.
- [ ] **P4.3 — Backend Views & Endpoints**:
  - `GET /api/clubs/`, `GET /api/clubs/<id>/`, `POST /api/clubs/`, `PATCH /api/clubs/<id>/`, `DELETE /api/clubs/<id>/`.
  - `POST /api/clubs/<id>/join/`, `DELETE /api/clubs/<id>/leave/`, `GET /api/clubs/my/`, `GET /api/clubs/<id>/members/`.
  - Membership approvals: `/approve/`, `/reject/`.
  - Community posts CRUD: `/api/clubs/<id>/posts/`.
  - Event Waitlist promotion in `EventRSVPView`.
- [ ] **P4.4 — Automated Backend Tests**:
  - Unit and integration tests for club creation, membership applications, leader approvals, posts permissions, and atomic waitlist promotion.
- [ ] **P4.5 — Frontend API & Types**:
  - Extend `types/campus.ts` and `lib/api.ts`.
- [ ] **P4.6 — Frontend Pages & UI**:
  - `/clubs` (Directory, search, category filters, responsive cards).
  - `/clubs/[id]` (Hero, overview, member/leave button, community feed, upcoming club events, roster).
  - `/clubs/create`, `/clubs/[id]/edit`, `/clubs/[id]/manage` (Leadership command center).
  - `/dashboard/clubs` (Student portal).
  - Update `Navbar.tsx` and `RSVPButton.tsx` (waitlist state).
- [ ] **P4.7 — Verification & Static Analysis**:
  - `python manage.py test users campus core`.
  - `npm run lint` & `npm run build`.
- [ ] **P4.8 — Browser Verification**:
  - Playwright end-to-end user journey test.
- [ ] **P4.9 — Documentation & Walkthrough**:
  - Update `docs/API.md`, `docs/ARCHITECTURE.md`, `walkthrough.md`.
