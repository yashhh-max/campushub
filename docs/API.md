# CampusHub REST API Documentation

Base URL in local development: `http://localhost:8000`

---

## 1. Authentication Endpoints (`/api/auth/`)

### 1.1 Register Student Account
Creates a new student user and associated `StudentProfile`.

- **Endpoint**: `/api/auth/register/`
- **Method**: `POST`
- **Authentication**: None (Public)
- **Request Body**:
```json
{
  "email": "alex.student@state.edu",
  "full_name": "Alex Student",
  "password": "StrongPassword123!",
  "student_id": "STU-9921",
  "department": "Computer Science",
  "graduation_year": 2027
}
```
- **Success Response (201 Created)**:
```json
{
  "message": "Registration successful.",
  "user": {
    "id": 1,
    "email": "alex.student@state.edu",
    "full_name": "Alex Student",
    "role": "student",
    "is_staff": false,
    "date_joined": "2026-09-20T22:00:00Z",
    "profile": {
      "student_id": "STU-9921",
      "department": "Computer Science",
      "graduation_year": 2027,
      "bio": "",
      "created_at": "2026-09-20T22:00:00Z",
      "updated_at": "2026-09-20T22:00:00Z"
    }
  },
  "tokens": {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.2 User Login
Authenticates an existing user and returns JWT access and refresh tokens.

- **Endpoint**: `/api/auth/login/`
- **Method**: `POST`
- **Authentication**: None (Public)
- **Request Body**:
```json
{
  "email": "alex.student@state.edu",
  "password": "StrongPassword123!"
}
```
- **Success Response (200 OK)**:
```json
{
  "message": "Login successful.",
  "user": {
    "id": 1,
    "email": "alex.student@state.edu",
    "full_name": "Alex Student",
    "role": "student"
  },
  "tokens": {
    "access": "eyJhbGciOiJIUzI1Ni...",
    "refresh": "eyJhbGciOiJIUzI1Ni..."
  }
}
```

---

### 1.3 Refresh Access Token
Obtains a new access token using a valid refresh token.

- **Endpoint**: `/api/auth/token/refresh/`
- **Method**: `POST`
- **Request Body**:
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Success Response (200 OK)**:
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 1.4 Current User Profile
Retrieves authenticated user details and profile.

- **Endpoint**: `/api/auth/me/`
- **Method**: `GET`
- **Authentication**: `Bearer <access_token>`
- **Success Response (200 OK)**:
```json
{
  "id": 1,
  "email": "alex.student@state.edu",
  "full_name": "Alex Student",
  "role": "student",
  "is_staff": false,
  "profile": {
    "student_id": "STU-9921",
    "department": "Computer Science",
    "graduation_year": 2027,
    "bio": ""
  }
}
```

---

### 1.5 Logout & Token Blacklist
Invalidates the submitted refresh token so it cannot be reused.

- **Endpoint**: `/api/auth/logout/`
- **Method**: `POST`
- **Authentication**: `Bearer <access_token>`
- **Request Body**:
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Success Response (200 OK)**:
```json
{
  "message": "Logged out successfully. Token invalidated."
}
```

---

## 2. Event Management & RSVP Endpoints (`/api/events/`)

### 2.1 List Events
Fetches a paginated list of published events (or user's own drafted events if authenticated).

- **Endpoint**: `/api/events/`
- **Method**: `GET`
- **Authentication**: Optional (returns personalization metadata like `user_rsvp_status` if token provided)
- **Query Parameters**:
  - `category`: Filter by event category (`Tech`, `Career`, `Arts`, `Social`, `Academic`, `Sports`)
  - `search`: Case-insensitive text search across title, description, location, and tags
  - `upcoming`: `true` to show only upcoming events (`start_time >= now`)
  - `start_date`: ISO 8601 date string filter (`YYYY-MM-DD`)
  - `end_date`: ISO 8601 date string filter (`YYYY-MM-DD`)
  - `page`: Page number (default: `1`, page size: `9`)
- **Success Response (200 OK)**:
```json
{
  "count": 18,
  "next": "http://localhost:8000/api/events/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "HackCampus 2026: 36-Hour Hackathon",
      "category": "Tech",
      "description": "Join over 300 student innovators building campus solutions...",
      "location": "Engineering Complex & Online",
      "start_time": "2026-10-14T09:00:00Z",
      "end_time": "2026-10-14T21:00:00Z",
      "capacity": 300,
      "attendee_count": 248,
      "available_seats": 52,
      "is_full": false,
      "has_started": false,
      "has_ended": false,
      "featured": true,
      "image_gradient": "from-indigo-600 to-blue-700",
      "tags": ["Hackathon", "AI & ML", "Prizes"],
      "is_published": true,
      "club": {
        "id": 1,
        "name": "ACM Student Chapter",
        "slug": "acm-chapter",
        "category": "Technology",
        "accent_color": "border-indigo-500/20 text-indigo-600 bg-indigo-50"
      },
      "club_name": "ACM Student Chapter",
      "organizer": {
        "id": 2,
        "full_name": "Maya Lin",
        "email": "maya.leader@state.edu"
      },
      "user_rsvp_status": "attending",
      "is_organizer": false,
      "created_at": "2026-09-01T00:00:00Z"
    }
  ]
}
```

---

### 2.2 Event Details
Retrieves complete information for a specific event.

- **Endpoint**: `/api/events/<id>/`
- **Method**: `GET`
- **Authentication**: Optional (personalization and organizer controls returned if authenticated)
- **Success Response (200 OK)**: Full `EventItem` representation as above.
- **Error Response (404 Not Found)**:
```json
{
  "detail": "Event not found or not published."
}
```

---

### 2.3 Create Event
Allows authorized users (`club_leader`, `admin`, staff, or leader of the selected club) to publish or draft a new event.

- **Endpoint**: `/api/events/`
- **Method**: `POST`
- **Authentication**: Required (`Bearer <access_token>`)
- **Permissions**: `CanCreateEvent`
- **Request Body**:
```json
{
  "club": 1,
  "title": "AI Agent Design Summit",
  "category": "Tech",
  "description": "Exploration of autonomous AI agents in Python and Next.js.",
  "location": "Innovation Center Room 204",
  "start_time": "2026-11-20T10:00:00Z",
  "end_time": "2026-11-20T17:00:00Z",
  "capacity": 60,
  "image_gradient": "from-indigo-600 to-blue-700",
  "tags": ["AI", "Python", "Workshop"],
  "is_published": true
}
```
- **Validation Rules**:
  - `end_time` must be chronologically strictly after `start_time`.
  - `capacity` must be at least 1.
  - Selected club must exist and be approved.
- **Success Response (201 Created)**: Returns the newly created `EventItem`.

---

### 2.4 Update Event
Allows the event organizer or an administrator to update details, timing, or capacity.

- **Endpoint**: `/api/events/<id>/`
- **Method**: `PATCH` / `PUT`
- **Authentication**: Required (`Bearer <access_token>`)
- **Permissions**: `IsEventOrganizerOrAdmin`
- **Validation Rules**:
  - `capacity` cannot be decreased below the existing confirmed `attendee_count`.
  - Timing validations apply.
- **Success Response (200 OK)**: Returns updated `EventItem`.

---

### 2.5 Delete Event
Permanently removes the event and cancels all associated RSVPs.

- **Endpoint**: `/api/events/<id>/`
- **Method**: `DELETE`
- **Authentication**: Required (`Bearer <access_token>`)
- **Permissions**: `IsEventOrganizerOrAdmin`
- **Success Response (204 No Content)**

---

### 2.6 RSVP to Event
Atomic, concurrency-safe reservation for the authenticated user.

- **Endpoint**: `/api/events/<id>/rsvp/`
- **Method**: `POST`
- **Authentication**: Required (`Bearer <access_token>`)
- **Concurrency & Invariants Enforced**:
  - Uses `select_for_update()` inside `transaction.atomic()`.
  - Rejects duplicate active RSVPs: returns `HTTP 400 {"detail": "You are already registered for this event."}`.
  - Rejects started/concluded events: returns `HTTP 400 {"detail": "Cannot RSVP to an event that has already started."}`.
  - Rejects overbooked events: returns `HTTP 400 {"detail": "This event is already at full capacity."}`.
- **Success Response (200 OK)**:
```json
{
  "message": "RSVP confirmed successfully.",
  "status": "attending",
  "available_seats": 51,
  "attendee_count": 249
}
```

---

### 2.7 Cancel RSVP
Allows a student to release their seat before the event starts.

- **Endpoint**: `/api/events/<id>/rsvp/`
- **Method**: `DELETE`
- **Authentication**: Required (`Bearer <access_token>`)
- **Validation**:
  - Cannot cancel after event start time.
  - Automatically restores available seat capacity in real time.
- **Success Response (200 OK)**:
```json
{
  "message": "RSVP cancelled successfully.",
  "status": "cancelled",
  "available_seats": 52,
  "attendee_count": 248
}
```

---

### 2.8 Student's Registered Events (My Events)
Returns all events the authenticated user has RSVP'd to.

- **Endpoint**: `/api/events/my/`
- **Method**: `GET`
- **Authentication**: Required (`Bearer <access_token>`)
- **Query Parameters**:
  - `filter`: `upcoming` | `past`
- **Success Response (200 OK)**:
```json
[
  {
    "rsvp_id": 14,
    "status": "attending",
    "rsvp_time": "2026-09-20T22:30:00Z",
    "event": {
      "id": 1,
      "title": "HackCampus 2026: 36-Hour Hackathon",
      "category": "Tech",
      "start_time": "2026-10-14T09:00:00Z",
      "end_time": "2026-10-14T21:00:00Z",
      "location": "Engineering Complex & Online",
      "club": {
        "id": 1,
        "name": "ACM Student Chapter"
      }
    }
  }
]
```

---

### 2.9 Organizer Attendee Roster
Exposes registered student roster with contact information only to the verified event organizer or campus administrators.

- **Endpoint**: `/api/events/<id>/attendees/`
- **Method**: `GET`
- **Authentication**: Required (`Bearer <access_token>`)
- **Permissions**: `CanViewAttendees` (Organizer, Club Leader, Admin)
- **Success Response (200 OK)**:
```json
{
  "event_id": 1,
  "event_title": "HackCampus 2026: 36-Hour Hackathon",
  "capacity": 300,
  "attendee_count": 248,
  "available_seats": 52,
  "attendees": [
    {
      "id": 5,
      "student_id": "STU-4819",
      "full_name": "Jordan Davis",
      "email": "jordan.davis@state.edu",
      "department": "Computer Engineering",
      "status": "attending",
      "rsvp_time": "2026-09-20T18:30:00Z"
    }
  ]
}
```

---

## 3. Clubs & Community Hub Endpoints (`/api/clubs/`)

### 3.1 Discover Clubs Catalog
Paginated directory of student clubs and societies with search and category filtering.

- **Endpoint**: `/api/clubs/`
- **Method**: `GET`
- **Authentication**: Optional (authenticated requests return current user's membership status)
- **Query Parameters**:
  - `search`: Search query string across name, description, and tags
  - `category`: Filter by category (`Technology`, `STEM`, `Leadership`, `Creative Arts`, `Volunteering`, `Culture`)
  - `ordering`: Field ordering (`name`, `-created_at`, `category`)
  - `page`: Page number (pagination: 9 clubs per page)
- **Success Response (200 OK)**:
```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "ACM Student Chapter",
      "slug": "acm-student-chapter",
      "category": "Technology",
      "description": "Weekly algorithmic coding sessions, tech talk speaker series, and premier hackathons.",
      "meeting_schedule": "Wednesdays @ 6:00 PM",
      "location": "Turing Engineering Hall, Room 302",
      "banner_gradient": "from-indigo-600 via-indigo-700 to-blue-700",
      "tags": ["Coding", "Algorithms", "Career Prep"],
      "membership_requires_approval": true,
      "member_count": 1,
      "events_count": 5,
      "leader_name": "Maya Lin",
      "leader_email": "maya.leader@state.edu",
      "user_membership_status": "approved",
      "user_membership_role": "member",
      "is_leader": false
    }
  ]
}
```

---

### 3.2 Club Details
Complete information for a single club, including meeting schedules, officer metadata, and member counts.

- **Endpoint**: `/api/clubs/<id_or_slug>/`
- **Method**: `GET`
- **Authentication**: Optional
- **Success Response (200 OK)**: Full `Club` serialization object.

---

### 3.3 Register a Club
Allows student leaders and campus administrators to register a new student organization.

- **Endpoint**: `/api/clubs/`
- **Method**: `POST`
- **Authentication**: Required (`Bearer <access_token>`)
- **Permissions**: `CanCreateClub` (Student with verified profile, Club Leader, Admin)
- **Request Body**:
```json
{
  "name": "Autonomous Robotics Lab",
  "category": "STEM",
  "description": "Interdisciplinary engineering team designing combat robots and autonomous drones.",
  "meeting_schedule": "Tuesdays & Thursdays @ 5:30 PM",
  "location": "Robotics Innovation Center",
  "banner_gradient": "from-indigo-600 via-indigo-700 to-blue-700",
  "tags": ["Hardware", "ROS2", "Robotics"],
  "membership_requires_approval": true
}
```
- **Success Response (201 Created)**: Created `Club` object with creator auto-assigned as president and primary leader.

---

### 3.4 Update Club Information
Modifies club metadata, meeting schedule, location, or visual theme.

- **Endpoint**: `/api/clubs/<id_or_slug>/`
- **Method**: `PATCH` / `PUT`
- **Authentication**: Required (`Bearer <access_token>`)
- **Permissions**: `IsClubLeaderOrAdmin` (Only club president, officer, or platform admin)

---

### 3.5 Join or Apply to a Club
Enrolls student as member if open, or creates a pending membership application if approval is required.

- **Endpoint**: `/api/clubs/<id_or_slug>/join/`
- **Method**: `POST`
- **Authentication**: Required (`Bearer <access_token>`)
- **Success Response (200 OK / 201 Created)**:
```json
{
  "message": "Application submitted successfully. Waiting for club leadership approval.",
  "status": "pending",
  "requires_approval": true,
  "membership_id": 12
}
```

---

### 3.6 Leave Club / Withdraw Application
Removes membership or cancels a pending application. Primary leaders cannot abandon without transferring leadership.

- **Endpoint**: `/api/clubs/<id_or_slug>/leave/`
- **Method**: `DELETE`
- **Authentication**: Required (`Bearer <access_token>`)
- **Success Response (200 OK)**:
```json
{
  "message": "You have left the club.",
  "status": "left"
}
```

---

### 3.7 My Clubs Dashboard
Aggregated dashboard data for the authenticated student: active memberships, pending applications, and clubs led.

- **Endpoint**: `/api/clubs/my/`
- **Method**: `GET`
- **Authentication**: Required (`Bearer <access_token>`)
- **Success Response (200 OK)**:
```json
{
  "joined_clubs": [
    {
      "membership_id": 12,
      "role": "member",
      "status": "approved",
      "title": "",
      "joined_at": "2026-09-21T04:20:00Z",
      "club": { "id": 1, "name": "ACM Student Chapter", ... }
    }
  ],
  "pending_applications": [],
  "led_clubs": [
    { "id": 1, "name": "ACM Student Chapter", "pending_applications_count": 0, ... }
  ]
}
```

---

### 3.8 Club Member Roster & Applications
Lists all approved members and pending applicant cards. Member contact info is restricted to authorized leaders/admins.

- **Endpoint**: `/api/clubs/<id_or_slug>/members/`
- **Method**: `GET`
- **Authentication**: Optional (authenticated leaders receive full application details)
- **Success Response (200 OK)**:
```json
{
  "club_id": 1,
  "club_name": "ACM Student Chapter",
  "member_count": 1,
  "pending_count": 0,
  "is_leader": true,
  "members": [
    {
      "id": 12,
      "club": 1,
      "user_id": 4,
      "full_name": "Alex Student",
      "email": "alex.student@state.edu",
      "department": "Software Engineering",
      "student_id": "STU-9921",
      "role": "member",
      "status": "approved",
      "title": "",
      "joined_at": "2026-09-21T04:20:00Z"
    }
  ]
}
```

---

### 3.9 Approve Membership Application
Approves a pending applicant and optionally assigns an officer role. Self-approval is strictly prohibited.

- **Endpoint**: `/api/clubs/<id_or_slug>/membership/<membership_id>/approve/`
- **Method**: `POST`
- **Authentication**: Required (`Bearer <access_token>`)
- **Permissions**: `IsClubLeaderOrAdmin`
- **Request Body**:
```json
{
  "role": "member",
  "title": "Hackathon Organizer"
}
```
- **Success Response (200 OK)**:
```json
{
  "message": "Approved Alex Student as member.",
  "membership": { ... }
}
```

---

### 3.10 Reject or Remove Member
Rejects an applicant or revokes club membership.

- **Endpoint**: `/api/clubs/<id_or_slug>/membership/<membership_id>/reject/`
- **Method**: `POST`
- **Authentication**: Required (`Bearer <access_token>`)
- **Permissions**: `IsClubLeaderOrAdmin`
- **Success Response (200 OK)**: `{"message": "Membership removed successfully.", "status": "removed"}`

---

### 3.11 Club Community Posts Feed
Community discussion feed supporting announcements, project updates, and open student discussions.

- **Endpoint**: `/api/clubs/<id_or_slug>/posts/`
- **Method**: `GET`
- **Query Parameters**: `?post_type=announcement&search=workshop`
- **Method**: `POST` (create new post - requires membership or leadership)
- **Request Body**:
```json
{
  "title": "Spring 2026 Tech Hackathon & Workshop Series",
  "content": "We are thrilled to announce our upcoming workshop series and community projects.",
  "post_type": "discussion",
  "is_pinned": true,
  "is_members_only": false
}
```
- **Permissions**: Public users can read public posts; club members can view members-only posts; officers can moderate and pin.

---

### 3.12 Edit or Delete Community Post
- **Endpoint**: `/api/clubs/<id_or_slug>/posts/<post_id>/`
- **Method**: `PATCH` / `DELETE`
- **Permissions**: `CanManageClubPost` (Author can edit/delete; Club Leaders and Admins can moderate/delete any post).

---

### 3.13 Event Waitlist System (`/api/events/<id>/rsvp/`)
Enhanced RSVP handling with atomic waitlist management and FIFO auto-promotion.

- **Join Waitlist**: `POST /api/events/<id>/rsvp/` with body `{"waitlist": true}`:
```json
{
  "message": "You have joined the waitlist for this event.",
  "status": "waitlist",
  "available_seats": 0,
  "attendee_count": 1,
  "waitlist_position": 1,
  "waitlist_count": 1
}
```
- **Auto-Promotion on Cancellation**: `DELETE /api/events/<id>/rsvp/`:
```json
{
  "message": "RSVP cancelled successfully.",
  "status": "cancelled",
  "promoted_waitlist_user": {
    "id": 4,
    "email": "alex.student@state.edu",
    "full_name": "Alex Student"
  },
  "available_seats": 0,
  "attendee_count": 1,
  "waitlist_count": 0
}
```

---

## 4. Announcements API (`/api/announcements/`)

### 4.1 Announcements List
Retrieves active, published campus announcements targeted to the requesting user (or all campus announcements for public/unauthenticated requests). College administrators receive all announcements including drafts, scheduled notices, and expired announcements.

- **Endpoint**: `/api/announcements/`
- **Method**: `GET`
- **Authentication**: Optional (JWT Bearer Token enhances results with student department/cohort targeting)
- **Query Parameters**:
  - `priority`: Filter by priority (`urgent`, `official`, `general`)
  - `search`: Full-text search across title and content
  - `target_audience`: Filter by audience (`everyone`, `department`, `graduation_year`, `both`)
  - `status`: For administrators (`draft`, `scheduled`, `published`, `expired`)
  - `page`, `page_size`: Pagination parameters
- **Response (200 OK)**:
```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 12,
      "title": "Urgent: CS Capstone Project & Lab Access Update",
      "content": "All computer science labs in Turing Hall will have extended 24-hour card access...",
      "priority": "urgent",
      "category": "Academic",
      "author": 2,
      "author_name": "Admin State",
      "author_email": "admin@state.edu",
      "author_title": "Dean of Engineering",
      "target_audience": "department",
      "target_department": "Computer Science",
      "target_graduation_year": 2026,
      "is_published": true,
      "scheduled_at": null,
      "expires_at": null,
      "published_at": "2026-09-21T05:08:00Z",
      "created_at": "2026-09-21T05:08:00Z",
      "updated_at": "2026-09-21T05:08:00Z",
      "computed_status": "published"
    }
  ]
}
```

### 4.2 Announcement Details
- **Endpoint**: `/api/announcements/<id>/`
- **Method**: `GET`
- **Permissions**: Public for published announcements matching targeting; Admin-only for drafts and scheduled notices.

### 4.3 Create Announcement (Admin Only)
- **Endpoint**: `/api/announcements/`
- **Method**: `POST`
- **Authentication**: Required (Staff / Admin role)
- **Request Body**:
```json
{
  "title": "Fall Commencement Ceremony Registration",
  "content": "Eligible seniors must submit cap and gown sizing by October 15.",
  "priority": "official",
  "category": "Ceremony",
  "author_title": "Office of the Registrar",
  "target_audience": "graduation_year",
  "target_graduation_year": 2027,
  "is_published": true,
  "scheduled_at": null,
  "expires_at": "2026-11-01T00:00:00Z"
}
```

### 4.4 Update Announcement (Admin Only)
- **Endpoint**: `/api/announcements/<id>/`
- **Method**: `PATCH` / `PUT`
- **Authentication**: Required (Staff / Admin role)

### 4.5 Delete Announcement (Admin Only)
- **Endpoint**: `/api/announcements/<id>/`
- **Method**: `DELETE`
- **Authentication**: Required (Staff / Admin role)

---

## 5. Notifications API (`/api/notifications/`)

### 5.1 Notifications List
Retrieves paginated notifications for the authenticated user, ordered with newest notifications first. Strict server-side recipient isolation prevents unauthorized cross-user access.

- **Endpoint**: `/api/notifications/`
- **Method**: `GET`
- **Authentication**: Required (JWT Bearer Token)
- **Query Parameters**:
  - `status`: `all`, `unread`, `read` (default: `all`)
  - `notification_type`: Filter by type (`announcement`, `event_reminder`, `event_rsvp`, `waitlist_promotion`, `club_application_approved`, `club_application_rejected`, `club_post`, `system`)
  - `page`, `page_size`: Pagination controls
- **Response (200 OK)**:
```json
{
  "count": 4,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 14,
      "recipient": 4,
      "recipient_email": "alex.student@state.edu",
      "notification_type": "event_rsvp",
      "title": "RSVP Confirmed: Fall Career Fair & Alumni Tech Networking",
      "message": "Your registration has been confirmed for Sep 26, 2026 at 10:00 AM.",
      "related_event": 2,
      "related_event_title": "Fall Career Fair & Alumni Tech Networking",
      "related_club": null,
      "related_announcement": null,
      "link_url": "/events/2",
      "is_read": false,
      "created_at": "2026-09-21T05:15:00Z"
    }
  ]
}
```

### 5.2 Unread Notification Count
Returns a lightweight badge count of all unread notifications for navbar bell badges.

- **Endpoint**: `/api/notifications/unread-count/`
- **Method**: `GET`
- **Authentication**: Required (JWT Bearer Token)
- **Response (200 OK)**:
```json
{
  "unread_count": 3
}
```

### 5.3 Mark Single Notification Read
- **Endpoint**: `/api/notifications/<id>/read/`
- **Method**: `POST`
- **Authentication**: Required (JWT Bearer Token - recipient restricted)
- **Response (200 OK)**:
```json
{
  "message": "Notification marked as read.",
  "is_read": true
}
```

### 5.4 Mark All Notifications Read
- **Endpoint**: `/api/notifications/read-all/`
- **Method**: `POST`
- **Authentication**: Required (JWT Bearer Token)
- **Response (200 OK)**:
```json
{
  "message": "All notifications marked as read.",
  "updated_count": 3
}
```

### 5.5 Delete Single Notification
- **Endpoint**: `/api/notifications/<id>/`
- **Method**: `DELETE`
- **Authentication**: Required (JWT Bearer Token - recipient restricted)
- **Response (204 No Content)**

---

## 6. Notification Preferences API (`/api/notifications/preferences/`)

### 6.1 Get & Update Notification Preferences
Allows students to manage granular delivery channels and opt in/out of specific notification types.

- **Endpoint**: `/api/notifications/preferences/`
- **Method**: `GET` / `PATCH` / `PUT`
- **Authentication**: Required (JWT Bearer Token)
- **Request Body (PATCH)**:
```json
{
  "announcements": true,
  "event_reminders": true,
  "rsvp_updates": true,
  "waitlist_promotions": true,
  "club_activity": false,
  "email_notifications": true
}
```
- **Response (200 OK)**:
```json
{
  "announcements": true,
  "event_reminders": true,
  "rsvp_updates": true,
  "waitlist_promotions": true,
  "club_activity": false,
  "email_notifications": true,
  "updated_at": "2026-09-21T05:18:00Z"
}
```

---

## 7. System Health Endpoints (`/api/health/`)

### 7.1 Detailed System Health
- **Endpoint**: `/api/health/`
- **Method**: `GET`
- **Response**: `{"status": "healthy", "database": "connected", "database_engine": "django.db.backends.sqlite3", ...}`

### 7.2 Liveness Probe
- **Endpoint**: `/api/health/ping/`
- **Method**: `GET`
- **Response**: `{"status": "pong", "service": "campushub-api"}`
