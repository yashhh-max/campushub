# CampusHub Phase 4 Requirements Specification

## 1. Club Management & Discovery Requirements
- **R1.1**: Students must be able to discover approved college clubs with search across title, description, and tags.
- **R1.2**: Support category filtering across Technology, STEM, Leadership, Creative Arts, Volunteering, and Culture.
- **R1.3**: Club detail page must show header banner, meeting schedule, venue, leader info, member count, upcoming club events, and community feed.
- **R1.4**: Authorized club leaders/admins can edit club profile, meeting information, category, and tags.

## 2. Membership Lifecycle Requirements
- **R2.1**: Students can join/apply to clubs (`POST /api/clubs/<id>/join/`).
- **R2.2**: Duplicate memberships for the same club must be strictly prevented by database `UniqueConstraint(club, user)`.
- **R2.3**: If membership approval is required, the membership state is set to `pending`.
- **R2.4**: Club leaders/moderators/admins can approve or reject membership applications via dedicated endpoints. Self-approval is strictly forbidden.
- **R2.5**: Students can leave clubs (`DELETE /api/clubs/<id>/leave/`) unless they are the primary club leader (who must first transfer ownership).
- **R2.6**: Student dashboard at `/dashboard/clubs` displays all joined clubs and pending applications.

## 3. Community Posts Requirements
- **R3.1**: Clubs have a community discussion and announcements board (`/api/clubs/<id>/posts/`).
- **R3.2**: Post types: `announcement`, `update`, `discussion`.
- **R3.3**: Public visitors can view public posts; member-only posts (`is_members_only=True`) require an approved membership.
- **R3.4**: Approved members can author discussions; only leaders/moderators/admins can author announcements or pin posts.

## 4. Club-Event Integration Requirements
- **R4.1**: Club detail view displays all upcoming events hosted by the club, reusing Phase 3 event infrastructure.
- **R4.2**: Club leaders can create new events pre-associated with their club.

## 5. Event Waitlist Requirements
- **R5.1**: When an event is full, students see a "Join Waitlist" action.
- **R5.2**: Store waitlist status (`EventRSVP.status='waitlist'`) with position tracking.
- **R5.3**: When an active attendee cancels their RSVP, the earliest waitlist entry is atomically promoted to `status='attending'`.
- **R5.4**: Concurrency and capacity invariants must remain strictly preserved.
