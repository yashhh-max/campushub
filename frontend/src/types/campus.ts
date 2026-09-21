export type EventCategory = 'Tech' | 'Career' | 'Arts' | 'Social' | 'Academic' | 'Sports';

export interface ClubSummary {
  id: number;
  name: string;
  slug: string;
  category: string;
  accent_color: string;
  leader_name?: string;
}

export interface EventOrganizer {
  id: number;
  full_name: string;
  email: string;
}

export interface EventItem {
  id: number | string;
  title: string;
  category: EventCategory;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  date?: string;
  time?: string;
  capacity: number;
  rsvp_count: number;
  rsvpCount?: number;
  attendee_count: number;
  waitlist_count?: number;
  available_seats: number;
  is_full: boolean;
  has_started: boolean;
  has_ended: boolean;
  featured?: boolean;
  image_gradient?: string;
  imageGradient?: string;
  tags?: string[];
  is_published: boolean;
  club?: ClubSummary;
  club_name?: string;
  organizer?: EventOrganizer | string | null;
  user_rsvp_status?: 'attending' | 'waitlist' | 'cancelled' | null;
  user_waitlist_position?: number | null;
  is_organizer?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface EventAttendee {
  id: number;
  student_id: string;
  full_name: string;
  email: string;
  department: string;
  status: 'attending' | 'waitlist' | 'cancelled';
  rsvp_time: string;
}

export interface EventAttendeesResponse {
  event_id: number;
  event_title: string;
  capacity: number;
  attendee_count: number;
  available_seats: number;
  attendees: EventAttendee[];
}

export interface MyEventRegistration {
  rsvp_id: number;
  status: 'attending' | 'waitlist' | 'cancelled';
  rsvp_time: string;
  event: EventItem;
}

export interface PaginatedEventsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: EventItem[];
}

export interface EventCreatePayload {
  club: number;
  title: string;
  category: EventCategory;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  capacity: number;
  featured?: boolean;
  image_gradient?: string;
  tags?: string[];
  is_published?: boolean;
}

export type ClubCategory = 'Technology' | 'Leadership' | 'Creative Arts' | 'STEM' | 'Volunteering' | 'Culture';
export type ClubRole = 'member' | 'moderator' | 'vice_president' | 'president';
export type ClubMembershipStatus = 'pending' | 'approved' | 'rejected';
export type ClubPostType = 'announcement' | 'update' | 'discussion';

export interface ClubItem {
  id: number | string;
  name: string;
  slug: string;
  category: ClubCategory;
  description: string;
  memberCount?: number;
  member_count?: number;
  president?: string;
  leader_name?: string;
  leader_email?: string;
  meeting_schedule?: string;
  meetingSchedule?: string;
  location?: string;
  accent_color: string;
  accentColor?: string;
  banner_gradient?: string;
  bannerGradient?: string;
  membership_requires_approval?: boolean;
  tags: string[];
  is_approved?: boolean;
  pending_applications_count?: number;
  user_membership_status?: ClubMembershipStatus | null;
  user_membership_role?: ClubRole | null;
  is_leader?: boolean;
  events_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedClubsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ClubItem[];
}

export interface ClubMembershipItem {
  id: number;
  club: number;
  club_name: string;
  club_slug: string;
  user_id: number;
  full_name: string;
  email: string;
  department: string;
  student_id: string;
  role: ClubRole;
  status: ClubMembershipStatus;
  title: string;
  joined_at: string;
  updated_at?: string;
}

export interface MyClubItem {
  membership_id: number;
  role: ClubRole;
  status: ClubMembershipStatus;
  title: string;
  joined_at: string;
  club: ClubItem;
}

export interface MyClubsResponse {
  joined_clubs: MyClubItem[];
  pending_applications: MyClubItem[];
  led_clubs: ClubItem[];
}

export interface ClubMembersResponse {
  club_id: number;
  club_name: string;
  member_count: number;
  pending_count: number;
  is_leader: boolean;
  members: ClubMembershipItem[];
}

export interface ClubPostItem {
  id: number;
  club: number;
  author: number;
  author_name: string;
  author_email: string;
  author_role: string;
  title: string;
  content: string;
  post_type: ClubPostType;
  is_pinned: boolean;
  is_members_only: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ClubCreatePayload {
  name: string;
  slug?: string;
  category: ClubCategory;
  description: string;
  meeting_schedule?: string;
  location?: string;
  accent_color?: string;
  banner_gradient?: string;
  membership_requires_approval?: boolean;
  tags?: string[];
}

export interface ClubPostCreatePayload {
  title: string;
  content: string;
  post_type: ClubPostType;
  is_pinned?: boolean;
  is_members_only?: boolean;
}

export type AnnouncementPriority = 'urgent' | 'official' | 'general';
export type AnnouncementTargetAudience = 'everyone' | 'department' | 'graduation_year' | 'both';
export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'expired';

export interface AnnouncementItem {
  id: number | string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  category?: string;
  author?: number | string | null;
  author_name?: string;
  author_email?: string;
  author_title?: string;
  target_audience?: AnnouncementTargetAudience;
  target_department?: string;
  target_graduation_year?: number | null;
  is_published?: boolean;
  scheduled_at?: string | null;
  expires_at?: string | null;
  published_at?: string;
  publishedAt?: string;
  created_at?: string;
  updated_at?: string;
  computed_status?: AnnouncementStatus;
}

export interface AnnouncementCreatePayload {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  category?: string;
  author_title?: string;
  target_audience: AnnouncementTargetAudience;
  target_department?: string;
  target_graduation_year?: number | null;
  is_published: boolean;
  scheduled_at?: string | null;
  expires_at?: string | null;
}

export type NotificationType =
  | 'announcement'
  | 'event_reminder'
  | 'event_rsvp'
  | 'waitlist_promotion'
  | 'club_application'
  | 'club_application_approved'
  | 'club_application_rejected'
  | 'club_post'
  | 'system';

export interface NotificationItem {
  id: number;
  recipient: number;
  recipient_email?: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  related_event?: number | null;
  related_event_title?: string | null;
  related_club?: number | null;
  related_club_name?: string | null;
  related_announcement?: number | null;
  related_announcement_title?: string | null;
  link_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreference {
  announcements: boolean;
  event_reminders: boolean;
  rsvp_updates: boolean;
  waitlist_promotions: boolean;
  club_activity: boolean;
  email_notifications: boolean;
  updated_at?: string;
}

export interface PaginatedNotificationsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NotificationItem[];
}

export interface PaginatedAnnouncementsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AnnouncementItem[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'offline' | 'checking';
  app?: string;
  version?: string;
  database?: string;
  uptime_seconds?: number;
  timestamp?: string;
  error?: string;
}

export interface ClubMessage {
  id: number;
  club: number;
  sender_id: number;
  sender_name: string;
  sender_email: string;
  sender_role: string;
  content: string;
  is_deleted: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at?: string;
}

export interface EventAnswer {
  id: number;
  question: number;
  author: number;
  author_name: string;
  author_email: string;
  author_role: string;
  content: string;
  is_official: boolean;
  created_at: string;
  updated_at?: string;
}

export interface EventQuestion {
  id: number;
  event: number;
  author: number;
  author_name: string;
  author_email: string;
  content: string;
  is_pinned: boolean;
  upvotes_count: number;
  has_upvoted: boolean;
  answers: EventAnswer[];
  can_delete: boolean;
  created_at: string;
  updated_at?: string;
}

export type TicketStatus = 'valid' | 'checked_in' | 'used' | 'cancelled';

export interface EventTicket {
  id: number;
  ticket_code: string;
  qr_payload: string;
  status: TicketStatus;
  is_checked_in: boolean;
  issued_at: string;
  checked_in_at?: string | null;
  event_id: number;
  event_title: string;
  event_location: string;
  event_start_time: string;
  event_end_time: string;
  club_name?: string;
  attendee_name: string;
  attendee_email: string;
  qr_code_svg?: string;
}

export interface AttendeeCheckInRecord {
  id: number;
  rsvp_id: number;
  user_id: number;
  full_name: string;
  email: string;
  student_id: string;
  department: string;
  ticket_code?: string | null;
  ticket_status: string;
  is_checked_in: boolean;
  checked_in_at?: string | null;
  rsvp_time: string;
}

export interface CheckInResponse {
  message: string;
  duplicate?: boolean;
  ticket_code: string;
  ticket?: {
    ticket_code: string;
  };
  attendee: {
    id: number;
    name: string;
    email: string;
    ticket_code: string;
    checked_in_at: string;
  };
  checked_in_count: number;
  registered_count: number;
  checkin_percentage: number;
}

export interface AttendanceStats {
  event_id: number;
  event_title: string;
  capacity: number;
  registered_count: number;
  checked_in_count: number;
  no_show_count: number;
  checkin_percentage: number;
  attendees: AttendeeCheckInRecord[];
}


