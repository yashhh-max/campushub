# CampusHub — Database & Performance Optimization Guide

## 1. Overview
CampusHub is optimized for high-throughput academic workflows including flash event registrations, campus-wide broadcast announcements, real-time club chat rooms, and high-concurrency QR code check-in lines.

---

## 2. Query Optimization & N+1 Prevention

### 2.1 Eager Loading (`select_related` and `prefetch_related`)
In Django REST Framework, serializers traversing foreign keys and many-to-many relations cause $O(N)$ additional database queries if left unoptimized. The following optimizations are enforced in `backend/campus/views.py`:

| Endpoint | Base Model | Eager-Loaded Relations | Impact |
|---|---|---|---|
| `/api/events/` | `Event` | `select_related('club', 'created_by')` | 1 query instead of $1 + 2N$ queries |
| `/api/events/my/` | `EventRSVP` | `select_related('event', 'event__club', 'event__created_by')` | Single JOIN query across attendee schedule |
| `/api/clubs/` | `Club` | `select_related('leader')` | Eliminates leader profile lookups per card |
| `/api/announcements/` | `Announcement` | `select_related('author')` | Direct author resolution for targeted notices |
| `/api/notifications/` | `Notification` | `select_related('related_event', 'related_club', 'related_announcement')` | Fetches notification payload in one query |
| `/api/events/<id>/questions/`| `EventQuestion` | `select_related('author').prefetch_related('answers__author', 'upvotes')` | Complete Q&A thread in 3 constant queries |
| `/api/events/<id>/attendance/`| `EventRSVP` | `select_related('user__profile')` | Resolves student ID and department in single query |
| `/api/clubs/<id>/chat/` | `ClubMessage` | `select_related('sender')` | 50 messages retrieved in 1 query |

---

## 3. Indexing Strategy

Indexes have been placed on fields and composite combinations based on real query patterns:

```python
# EventRSVP: High-frequency waitlist position resolution
Index(fields=['event', 'status', 'created_at'])

# EventTicket: Fast ticket scanner lookup and status checks
Index(fields=['ticket_code'])
Index(fields=['event', 'status'])
Index(fields=['event', 'status', 'is_checked_in'])

# Club: Category filtering and approval checks
Index(fields=['category', 'is_approved'])

# Event: Chronological ordering and category filtering
Index(fields=['start_time', 'is_published'])
Index(fields=['category', 'is_published'])

# Notification: Fast recipient filtering and unread count
Index(fields=['recipient', 'is_read'])
Index(fields=['recipient', '-created_at'])

# ClubMessage: Real-time chat history fetching
Index(fields=['club', 'created_at'])

# EventQuestion: Pinned status and timestamp ordering
Index(fields=['event', '-is_pinned', '-created_at'])
```

---

## 4. Concurrency & Race Condition Defenses

### 4.1 Row-Level Locking (`select_for_update`)
During high-demand RSVP registrations and waitlist promotions, race conditions could cause overbooking beyond the event's capacity.
- `EventRSVPView.post`: Wraps capacity evaluation inside `transaction.atomic()` with `Event.objects.select_for_update().get(pk=pk)` to prevent two students from booking the last seat simultaneously.
- `EventRSVPView.delete`: Uses `select_for_update()` on `Event` and `EventRSVP` during cancellation to ensure exactly one waitlisted student is promoted.
- `EventCheckInView`: Uses `select_for_update()` on `EventTicket` to prevent duplicate scanning if two ticket scanners process the same QR code concurrently.

---

## 5. Frontend Performance

- **Next.js 16 App Router & Turbopack**: Production builds are statically pre-rendered for public pages (`/`, `/events`, `/clubs`, `/login`, `/register`) with dynamic server-rendering for authenticated routes (`/clubs/[id]`, `/events/[id]`).
- **Code Splitting**: Dynamic imports for client-only QR scanner components (`html5-qrcode`) to prevent blocking the initial bundle load.
- **Font Optimization**: Utilizes Google Font subsets with `font-display: swap` and layout shift elimination.
- **Asset Optimization**: High-performance SVG generation for QR tickets; zero external image latency.
