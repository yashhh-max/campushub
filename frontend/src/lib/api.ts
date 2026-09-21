import {
  SystemHealth,
  EventItem,
  PaginatedEventsResponse,
  EventCreatePayload,
  EventAttendeesResponse,
  MyEventRegistration,
  ClubItem,
  PaginatedClubsResponse,
  ClubCreatePayload,
  ClubMembershipItem,
  MyClubsResponse,
  ClubMembersResponse,
  ClubPostItem,
  ClubPostCreatePayload,
  ClubRole,
  ClubMembershipStatus,
  AnnouncementItem,
  AnnouncementCreatePayload,
  NotificationItem,
  NotificationPreference,
  PaginatedNotificationsResponse,
  PaginatedAnnouncementsResponse,
  ClubMessage,
  EventQuestion,
  EventAnswer,
  EventTicket,
  AttendanceStats,
  AttendeeCheckInRecord,
  CheckInResponse,
} from "@/types/campus";

import {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from "@/types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// System Health Check
export async function fetchSystemHealth(): Promise<SystemHealth> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${API_BASE_URL}/api/health/`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        status: "degraded",
        app: "CampusHub API",
        version: "1.0.0",
        database: errorData.database || "disconnected",
        error: errorData.database_error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      status: "healthy",
      app: data.app || "CampusHub API",
      version: data.version || "1.0.0",
      database: data.database || "connected",
      uptime_seconds: data.uptime_seconds,
      timestamp: data.timestamp,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Network error";
    return {
      status: "offline",
      app: "CampusHub API",
      version: "1.0.0",
      database: "unreachable",
      error: errorMessage,
    };
  }
}

// Authentication APIs
export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg =
      data.errors?.email?.[0] ||
      data.errors?.password?.[0] ||
      data.message ||
      "Registration failed. Please check your details.";
    throw new Error(errorMsg);
  }

  return data;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg =
      data.errors?.non_field_errors?.[0] ||
      data.errors?.email?.[0] ||
      data.errors?.password?.[0] ||
      data.message ||
      "Invalid email or password.";
    throw new Error(errorMsg);
  }

  return data;
}

export async function fetchMe(accessToken: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Session expired or invalid token.");
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Unable to refresh token.");
  }

  const data = await response.json();
  return data.access;
}

export async function logoutUser(refreshToken: string, accessToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });
  } catch {
    // Ignore network error during logout cleanup
  }
}

// Event Discovery & Management APIs
export interface EventQueryParams {
  search?: string;
  category?: string;
  upcoming?: boolean;
  club?: string | number;
  page?: number;
  status?: string;
}

export async function fetchEvents(
  params?: EventQueryParams,
  token?: string
): Promise<PaginatedEventsResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.category && params.category.toLowerCase() !== "all") {
    query.set("category", params.category);
  }
  if (params?.upcoming) query.set("upcoming", "true");
  if (params?.club) query.set("club", String(params.club));
  if (params?.page) query.set("page", String(params.page));
  if (params?.status) query.set("status", params.status);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/events/?${query.toString()}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load events: HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchEventById(
  id: string | number,
  token?: string
): Promise<EventItem> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/events/${id}/`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Event not found (HTTP ${response.status})`);
  }

  return response.json();
}

export async function rsvpEvent(
  id: string | number,
  token: string,
  waitlist?: boolean
): Promise<{
  message: string;
  status: string;
  available_seats: number;
  attendee_count: number;
  waitlist_position?: number;
  waitlist_count?: number;
  can_waitlist?: boolean;
}> {
  const response = await fetch(`${API_BASE_URL}/api/events/${id}/rsvp/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify({ waitlist: !!waitlist }),
  });

  const data = await response.json();
  if (!response.ok) {
    const err: Error & { can_waitlist?: boolean; status?: string } = new Error(
      data.detail || "Unable to confirm RSVP."
    );
    err.can_waitlist = data.can_waitlist;
    err.status = data.status;
    throw err;
  }

  return data;
}

export async function cancelEventRsvp(
  id: string | number,
  token: string
): Promise<{ message: string; status: string; available_seats: number; attendee_count: number }> {
  const response = await fetch(`${API_BASE_URL}/api/events/${id}/rsvp/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Unable to cancel RSVP.");
  }

  return data;
}

export async function fetchMyEvents(
  token: string,
  filter?: "upcoming" | "past"
): Promise<MyEventRegistration[]> {
  const query = filter ? `?filter=${filter}` : "";
  const response = await fetch(`${API_BASE_URL}/api/events/my/${query}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load registered events.");
  }

  return response.json();
}

export async function createEvent(
  payload: EventCreatePayload,
  token: string
): Promise<EventItem> {
  const response = await fetch(`${API_BASE_URL}/api/events/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg =
      data.detail ||
      (data.end_time && data.end_time[0]) ||
      (data.capacity && data.capacity[0]) ||
      (data.club && data.club[0]) ||
      "Failed to create event.";
    throw new Error(errorMsg);
  }

  return data;
}

export async function updateEvent(
  id: string | number,
  payload: Partial<EventCreatePayload>,
  token: string
): Promise<EventItem> {
  const response = await fetch(`${API_BASE_URL}/api/events/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg =
      data.detail ||
      (data.end_time && data.end_time[0]) ||
      (data.capacity && data.capacity[0]) ||
      "Failed to update event.";
    throw new Error(errorMsg);
  }

  return data;
}

export async function deleteEvent(
  id: string | number,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/events/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete event.");
  }
}

export async function fetchEventAttendees(
  id: string | number,
  token: string
): Promise<EventAttendeesResponse> {
  const response = await fetch(`${API_BASE_URL}/api/events/${id}/attendees/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load attendee roster.");
  }

  return response.json();
}

// Clubs Discovery & Management APIs
export interface ClubQueryParams {
  search?: string;
  category?: string;
  ordering?: string;
  page?: number;
}

export async function fetchClubs(
  params?: ClubQueryParams,
  token?: string
): Promise<PaginatedClubsResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.category && params.category.toLowerCase() !== "all") {
    query.set("category", params.category);
  }
  if (params?.ordering) query.set("ordering", params.ordering);
  if (params?.page) query.set("page", String(params.page));

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/clubs/?${query.toString()}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load clubs: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data,
    };
  }
  return data;
}

export async function fetchClubById(
  idOrSlug: string | number,
  token?: string
): Promise<ClubItem> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/clubs/${idOrSlug}/`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Club not found (HTTP ${response.status})`);
  }

  return response.json();
}

export async function createClub(
  payload: ClubCreatePayload,
  token: string
): Promise<ClubItem> {
  const response = await fetch(`${API_BASE_URL}/api/clubs/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg =
      data.detail ||
      (data.name && data.name[0]) ||
      (data.category && data.category[0]) ||
      "Failed to create club.";
    throw new Error(errorMsg);
  }

  return data;
}

export async function updateClub(
  idOrSlug: string | number,
  payload: Partial<ClubCreatePayload>,
  token: string
): Promise<ClubItem> {
  const response = await fetch(`${API_BASE_URL}/api/clubs/${idOrSlug}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg =
      data.detail ||
      (data.name && data.name[0]) ||
      "Failed to update club.";
    throw new Error(errorMsg);
  }

  return data;
}

export async function deleteClub(
  idOrSlug: string | number,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/clubs/${idOrSlug}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete club.");
  }
}

// Club Membership APIs
export async function joinClub(
  idOrSlug: string | number,
  token: string
): Promise<{
  message: string;
  status: ClubMembershipStatus;
  membership_id?: number;
  requires_approval?: boolean;
}> {
  const response = await fetch(`${API_BASE_URL}/api/clubs/${idOrSlug}/join/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to join club.");
  }

  return data;
}

export async function leaveClub(
  idOrSlug: string | number,
  token: string
): Promise<{ message: string; status: string }> {
  const response = await fetch(`${API_BASE_URL}/api/clubs/${idOrSlug}/leave/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to leave club.");
  }

  return data;
}

export async function fetchMyClubs(token: string): Promise<MyClubsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/clubs/my/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load clubs.");
  }

  return response.json();
}

export async function fetchClubMembers(
  idOrSlug: string | number,
  token?: string
): Promise<ClubMembersResponse> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/clubs/${idOrSlug}/members/`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load club members.");
  }

  return response.json();
}

export async function approveClubMembership(
  idOrSlug: string | number,
  membershipId: number,
  data: { role?: ClubRole; title?: string },
  token: string
): Promise<{ message: string; membership: ClubMembershipItem }> {
  const response = await fetch(
    `${API_BASE_URL}/api/clubs/${idOrSlug}/membership/${membershipId}/approve/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Failed to approve membership.");
  }

  return resData;
}

export async function rejectClubMembership(
  idOrSlug: string | number,
  membershipId: number,
  token: string
): Promise<{ message: string; status: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/clubs/${idOrSlug}/membership/${membershipId}/reject/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Failed to reject membership.");
  }

  return resData;
}

// Club Community Posts APIs
export async function fetchClubPosts(
  idOrSlug: string | number,
  params?: { post_type?: string; search?: string },
  token?: string
): Promise<ClubPostItem[]> {
  const query = new URLSearchParams();
  if (params?.post_type && params.post_type.toLowerCase() !== "all") {
    query.set("post_type", params.post_type);
  }
  if (params?.search) query.set("search", params.search);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/clubs/${idOrSlug}/posts/?${query.toString()}`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return [];
  }

  return response.json();
}

export async function createClubPost(
  idOrSlug: string | number,
  payload: ClubPostCreatePayload,
  token: string
): Promise<ClubPostItem> {
  const response = await fetch(`${API_BASE_URL}/api/clubs/${idOrSlug}/posts/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg =
      data.detail ||
      (data.post_type && data.post_type[0]) ||
      (data.title && data.title[0]) ||
      (data.content && data.content[0]) ||
      "Failed to publish post.";
    throw new Error(errorMsg);
  }

  return data;
}

export async function updateClubPost(
  idOrSlug: string | number,
  postId: number,
  payload: Partial<ClubPostCreatePayload>,
  token: string
): Promise<ClubPostItem> {
  const response = await fetch(
    `${API_BASE_URL}/api/clubs/${idOrSlug}/posts/${postId}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to update post.");
  }

  return data;
}

export async function deleteClubPost(
  idOrSlug: string | number,
  postId: number,
  token: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/clubs/${idOrSlug}/posts/${postId}/`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete post.");
  }
}

// Announcements API
export async function fetchAnnouncements(options?: {
  priority?: string;
  search?: string;
  token?: string;
}): Promise<AnnouncementItem[]> {
  const params = new URLSearchParams();
  if (options?.priority) params.append("priority", options.priority);
  if (options?.search) params.append("search", options.search);

  const url = `${API_BASE_URL}/api/announcements/${params.toString() ? `?${params.toString()}` : ""}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options?.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function fetchAdminAnnouncements(
  token: string,
  options?: {
    status?: string;
    priority?: string;
    search?: string;
    target_audience?: string;
    page?: number;
  }
): Promise<PaginatedAnnouncementsResponse> {
  const params = new URLSearchParams();
  if (options?.status && options.status !== "all") params.append("status", options.status);
  if (options?.priority && options.priority !== "all") params.append("priority", options.priority);
  if (options?.search) params.append("search", options.search);
  if (options?.target_audience && options.target_audience !== "all") params.append("target_audience", options.target_audience);
  if (options?.page) params.append("page", options.page.toString());

  const url = `${API_BASE_URL}/api/announcements/${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load admin announcements.");
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return data;
}

export async function fetchAnnouncementDetail(
  id: number | string,
  token?: string
): Promise<AnnouncementItem> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/announcements/${id}/`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Announcement not found.");
  }
  return response.json();
}

export async function createAnnouncement(
  payload: AnnouncementCreatePayload,
  token: string
): Promise<AnnouncementItem> {
  const response = await fetch(`${API_BASE_URL}/api/announcements/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.detail || Object.values(data)[0] || "Failed to create announcement.";
    throw new Error(Array.isArray(errorMsg) ? errorMsg[0] : String(errorMsg));
  }
  return data;
}

export async function updateAnnouncement(
  id: number | string,
  payload: Partial<AnnouncementCreatePayload>,
  token: string
): Promise<AnnouncementItem> {
  const response = await fetch(`${API_BASE_URL}/api/announcements/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.detail || Object.values(data)[0] || "Failed to update announcement.";
    throw new Error(Array.isArray(errorMsg) ? errorMsg[0] : String(errorMsg));
  }
  return data;
}

export async function deleteAnnouncement(
  id: number | string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/announcements/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete announcement.");
  }
}

// Notifications API
export async function fetchNotifications(
  token: string,
  options?: {
    is_read?: boolean;
    type?: string;
    page?: number;
  }
): Promise<PaginatedNotificationsResponse> {
  const params = new URLSearchParams();
  if (options?.is_read !== undefined) params.append("is_read", options.is_read ? "true" : "false");
  if (options?.type) params.append("type", options.type);
  if (options?.page) params.append("page", options.page.toString());

  const url = `${API_BASE_URL}/api/notifications/${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load notifications.");
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return data;
}

export async function fetchUnreadNotificationCount(token: string): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return 0;
    const data = await response.json();
    return data.unread_count || 0;
  } catch {
    return 0;
  }
}

export async function markNotificationRead(
  id: number,
  token: string
): Promise<NotificationItem> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to mark notification as read.");
  }
  return data.notification;
}

export async function markAllNotificationsRead(
  token: string
): Promise<{ message: string; unread_count: number }> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/read-all/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to mark all as read.");
  }
  return data;
}

export async function deleteNotification(
  id: number,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete notification.");
  }
}

// Notification Preferences API
export async function fetchNotificationPreferences(
  token: string
): Promise<NotificationPreference> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/preferences/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch notification preferences.");
  }
  return response.json();
}

export async function updateNotificationPreferences(
  payload: Partial<NotificationPreference>,
  token: string
): Promise<NotificationPreference> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/preferences/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to update notification preferences.");
  }
  return data;
}

// ==============================================================================
// PHASE 6: CLUB CHAT, EVENT Q&A, TICKETS & ATTENDANCE APIS
// ==============================================================================

export async function fetchClubMessages(
  token: string,
  clubIdOrSlug: string | number
): Promise<ClubMessage[]> {
  const response = await fetch(`${API_BASE_URL}/api/clubs/${clubIdOrSlug}/messages/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to load club messages.");
  }
  return response.json();
}

export async function fetchEventQuestions(
  eventId: string | number,
  token?: string | null
): Promise<EventQuestion[]> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/questions/`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load event questions.");
  }
  return response.json();
}

export async function createEventQuestion(
  arg1: string | number,
  arg2: string | number,
  arg3: string
): Promise<EventQuestion> {
  let eventId: string | number;
  let content: string;
  let token: string;

  if (typeof arg1 === "number" || (typeof arg1 === "string" && !arg1.startsWith("ey") && arg1.length < 20)) {
    eventId = arg1;
    content = String(arg2);
    token = arg3;
  } else {
    token = String(arg1);
    eventId = arg2;
    content = arg3;
  }

  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/questions/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify({ content }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.content || data.detail || "Failed to submit question.");
  }
  return data;
}

export async function answerEventQuestion(
  arg1: string | number,
  arg2: string | number,
  arg3?: string | boolean,
  arg4?: string
): Promise<EventAnswer> {
  let questionId: number;
  let content: string;
  let isOfficial = false;
  let token: string;

  if (typeof arg1 === "number" || (typeof arg1 === "string" && !String(arg1).startsWith("ey"))) {
    questionId = Number(arg1);
    content = String(arg2);
    if (typeof arg3 === "boolean") {
      isOfficial = arg3;
      token = String(arg4);
    } else {
      token = String(arg3);
    }
  } else {
    token = String(arg1);
    questionId = Number(arg2);
    content = String(arg3);
  }

  const response = await fetch(`${API_BASE_URL}/api/events/questions/${questionId}/answers/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify({ content, is_official: isOfficial }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.content || data.detail || "Failed to post answer.");
  }
  return data;
}

export async function upvoteEventQuestion(
  arg1: string | number,
  arg2: string | number
): Promise<{ question_id: number; has_upvoted: boolean; upvotes_count: number }> {
  let questionId: number;
  let token: string;

  if (typeof arg1 === "number" || (typeof arg1 === "string" && !arg1.startsWith("ey"))) {
    questionId = Number(arg1);
    token = String(arg2);
  } else {
    token = String(arg1);
    questionId = Number(arg2);
  }

  const response = await fetch(`${API_BASE_URL}/api/events/questions/${questionId}/upvote/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to upvote question.");
  }
  return data;
}

export async function fetchMyTickets(
  token: string,
  status?: string
): Promise<EventTicket[]> {
  const url = status
    ? `${API_BASE_URL}/api/tickets/?status=${encodeURIComponent(status)}`
    : `${API_BASE_URL}/api/tickets/`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load tickets.");
  }
  const data = await response.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function fetchTicketDetail(
  token: string,
  codeOrId: string | number
): Promise<EventTicket> {
  const response = await fetch(`${API_BASE_URL}/api/tickets/${codeOrId}/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to load ticket.");
  }
  return response.json();
}

export async function checkInTicket(
  arg1: string | number,
  arg2: string | { ticket_code?: string; qr_payload?: string },
  arg3?: string
): Promise<CheckInResponse> {
  let eventId: string | number;
  let payload: { ticket_code?: string; qr_payload?: string };
  let token: string;

  if (typeof arg1 === "number" || (typeof arg1 === "string" && !String(arg1).startsWith("ey"))) {
    eventId = arg1;
    if (typeof arg2 === "string") {
      payload = { ticket_code: arg2 };
    } else {
      payload = arg2;
    }
    token = String(arg3);
  } else {
    token = String(arg1);
    eventId = typeof arg2 === "object" ? "" : arg2;
    payload = typeof arg3 === "string" ? { ticket_code: arg3 } : (arg2 as { ticket_code?: string; qr_payload?: string });
  }

  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/check-in/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.message || "Check-in failed.");
  }
  return data;
}

export async function fetchEventAttendance(
  arg1: string | number,
  arg2: string | number
): Promise<AttendanceStats> {
  let eventId: string | number;
  let token: string;

  if (typeof arg1 === "number" || (typeof arg1 === "string" && !String(arg1).startsWith("ey"))) {
    eventId = arg1;
    token = String(arg2);
  } else {
    token = String(arg1);
    eventId = arg2;
  }

  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/attendance/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to load attendance records.");
  }
  return data;
}

export async function manualCheckIn(
  arg1: string | number,
  arg2: string | number,
  arg3?: boolean | number,
  arg4?: string | boolean
): Promise<{
  message: string;
  is_checked_in: boolean;
  checked_in_count: number;
  registered_count: number;
  checkin_percentage: number;
  attendee: AttendeeCheckInRecord;
}> {
  let eventId: string | number;
  let attendeeId: number;
  let isCheckedIn: boolean;
  let token: string;

  if (typeof arg1 === "number" || (typeof arg1 === "string" && !String(arg1).startsWith("ey"))) {
    eventId = arg1;
    attendeeId = Number(arg2);
    isCheckedIn = Boolean(arg3);
    token = String(arg4);
  } else {
    token = String(arg1);
    eventId = arg2;
    attendeeId = Number(arg3);
    isCheckedIn = Boolean(arg4);
  }

  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/attendance/manual/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify({
      attendee_id: attendeeId,
      is_checked_in: isCheckedIn,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Manual check-in update failed.");
  }
  return data;
}

export function getEventAttendanceExportUrl(eventId: string | number, token?: string): string {
  const base = `${API_BASE_URL}/api/events/${eventId}/attendance/export/`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

