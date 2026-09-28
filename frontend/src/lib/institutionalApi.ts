import {
  Department,
  Opportunity,
  OpportunityApplication,
  ApprovalRequest,
  ApprovalActionPayload,
  AuditLog,
  SystemSetting,
  Company,
  PlacementDrive,
  PlacementApplication,
  PlacementInterview,
  AdminAnalytics,
  TPOReports,
} from '@/types/institutional';
import { User, StudentProfile, FacultyProfile } from '@/types/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchWithAuth<T>(
  endpoint: string,
  token?: string | null,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errorJson = await res.json();
      errorDetail =
        errorJson.error ||
        errorJson.detail ||
        errorJson.message ||
        JSON.stringify(errorJson);
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const institutionalApi = {
  // Users & RBAC
  getUsers: async (
    token: string,
    params?: { search?: string; role?: string; is_active?: boolean }
  ): Promise<User[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.role) q.set('role', params.role);
    if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
    const query = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchWithAuth<any>(`/api/auth/admin/users/${query}`, token);
    return Array.isArray(res) ? res : res.results || [];
  },

  updateUser: async (token: string, userId: number, data: Partial<User>): Promise<User> => {
    return fetchWithAuth<User>(`/api/auth/admin/users/${userId}/`, token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  toggleUserActive: async (token: string, userId: number): Promise<{ is_active: boolean }> => {
    return fetchWithAuth<{ is_active: boolean }>(
      `/api/auth/admin/users/${userId}/toggle-active/`,
      token,
      { method: 'POST' }
    );
  },

  // Students Academic Registry
  getStudents: async (
    token: string,
    params?: { search?: string; department?: string; year?: number }
  ): Promise<StudentProfile[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.department) q.set('department', params.department);
    if (params?.year) q.set('year', String(params.year));
    const query = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchWithAuth<any>(`/api/auth/admin/users/students/${query}`, token);
    return Array.isArray(res) ? res : res.results || [];
  },

  // Faculty Directory & Provisioning
  getFaculty: async (
    token: string,
    params?: { search?: string; department?: string }
  ): Promise<FacultyProfile[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.department) q.set('department', params.department);
    const query = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchWithAuth<any>(`/api/auth/admin/users/faculty/${query}`, token);
    return Array.isArray(res) ? res : res.results || [];
  },

  createFaculty: async (token: string, data: any): Promise<FacultyProfile> => {
    return fetchWithAuth<FacultyProfile>('/api/auth/admin/users/faculty/', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Departments
  getDepartments: async (token?: string | null): Promise<Department[]> => {
    const res = await fetchWithAuth<any>('/api/departments/', token);
    return Array.isArray(res) ? res : res.results || [];
  },

  createDepartment: async (token: string, data: Partial<Department>): Promise<Department> => {
    return fetchWithAuth<Department>('/api/departments/', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Clubs Governance
  getClubs: async (token?: string | null): Promise<any> => {
    return fetchWithAuth<any>('/api/clubs/', token);
  },

  approveClub: async (token: string, clubId: number): Promise<any> => {
    return fetchWithAuth<any>(`/api/clubs/${clubId}/approve/`, token, {
      method: 'POST',
    });
  },

  // Events & Attendees
  getEvents: async (token?: string | null, params?: { search?: string }): Promise<any> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    const query = q.toString() ? `?${q.toString()}` : '';
    return fetchWithAuth<any>(`/api/events/${query}`, token);
  },

  approveEvent: async (token: string, eventId: number): Promise<any> => {
    return fetchWithAuth<any>(`/api/events/${eventId}/approve/`, token, {
      method: 'POST',
    });
  },

  exportAttendees: async (token: string, eventId: number): Promise<Blob> => {
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(`${API_BASE}/api/events/${eventId}/export_attendees/`, { headers });
    if (!res.ok) throw new Error('Failed to export attendees roster.');
    return res.blob();
  },

  // Opportunities
  getOpportunities: async (
    token?: string | null,
    params?: { search?: string; opportunity_type?: string; status?: string }
  ): Promise<Opportunity[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.opportunity_type) q.set('opportunity_type', params.opportunity_type);
    if (params?.status) q.set('status', params.status);
    const query = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchWithAuth<any>(`/api/opportunities/${query}`, token);
    return Array.isArray(res) ? res : res.results || [];
  },

  createOpportunity: async (token: string, data: Partial<Opportunity>): Promise<Opportunity> => {
    return fetchWithAuth<Opportunity>('/api/opportunities/', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Unified Approval Center
  getApprovals: async (
    token: string,
    params?: { status?: string; item_type?: string }
  ): Promise<ApprovalRequest[]> => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.item_type) q.set('item_type', params.item_type);
    const query = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchWithAuth<any>(`/api/approvals/${query}`, token);
    return Array.isArray(res) ? res : res.results || [];
  },

  actionApproval: async (
    token: string,
    approvalId: number,
    payload: ApprovalActionPayload
  ): Promise<any> => {
    return fetchWithAuth<any>(`/api/approvals/${approvalId}/action/`, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Broadcast Notifications
  broadcastNotification: async (
    token: string,
    data: {
      target_audience: string;
      target_department?: string;
      target_year?: number;
      target_section?: string;
      target_club_id?: number;
      title: string;
      message: string;
      notification_type?: string;
      link_url?: string;
    }
  ): Promise<{ sent_count: number; message: string }> => {
    return fetchWithAuth<{ sent_count: number; message: string }>(
      '/api/notifications/broadcast/',
      token,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  // Institutional Analytics
  getAdminAnalytics: async (token: string): Promise<AdminAnalytics> => {
    return fetchWithAuth<AdminAnalytics>('/api/analytics/admin/', token);
  },

  // Security Audit Logs
  getAuditLogs: async (
    token: string,
    params?: { search?: string; action?: string; resource_type?: string }
  ): Promise<AuditLog[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.action) q.set('action', params.action);
    if (params?.resource_type) q.set('resource_type', params.resource_type);
    const query = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchWithAuth<any>(`/api/audit-logs/${query}`, token);
    return Array.isArray(res) ? res : res.results || [];
  },

  // System Settings
  getSystemSettings: async (token: string): Promise<SystemSetting> => {
    const res = await fetchWithAuth<any>('/api/settings/system/', token);
    if (Array.isArray(res) && res.length > 0) return res[0];
    return res as SystemSetting;
  },

  updateSystemSettings: async (
    token: string,
    data: Partial<SystemSetting>
  ): Promise<SystemSetting> => {
    return fetchWithAuth<SystemSetting>('/api/settings/system/', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // TPO: Companies
  getCompanies: async (
    token?: string | null,
    params?: { search?: string; tier?: string }
  ): Promise<Company[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.tier) q.set('tier', params.tier);
    const query = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchWithAuth<any>(`/api/companies/${query}`, token);
    return Array.isArray(res) ? res : res.results || [];
  },

  createCompany: async (token: string, data: Partial<Company>): Promise<Company> => {
    return fetchWithAuth<Company>('/api/companies/', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // TPO: Placement Drives
  getPlacementDrives: async (
    token?: string | null,
    params?: { search?: string; status?: string; company_id?: number }
  ): Promise<PlacementDrive[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.company_id) q.set('company_id', String(params.company_id));
    const query = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchWithAuth<any>(`/api/placements/drives/${query}`, token);
    return Array.isArray(res) ? res : res.results || [];
  },

  createPlacementDrive: async (
    token: string,
    data: Partial<PlacementDrive>
  ): Promise<PlacementDrive> => {
    return fetchWithAuth<PlacementDrive>('/api/placements/drives/', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  checkDriveEligibility: async (
    token: string,
    driveId: number
  ): Promise<{ eligible: boolean; reasons: string[] }> => {
    return fetchWithAuth<{ eligible: boolean; reasons: string[] }>(
      `/api/placements/drives/${driveId}/eligibility/`,
      token
    );
  },

  // TPO: Applications
  getPlacementApplications: async (
    token: string,
    params?: { drive_id?: number; student_id?: number; status?: string }
  ): Promise<PlacementApplication[]> => {
    const q = new URLSearchParams();
    if (params?.drive_id) q.set('drive_id', String(params.drive_id));
    if (params?.student_id) q.set('student_id', String(params.student_id));
    if (params?.status) q.set('status', params.status);
    const query = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchWithAuth<any>(`/api/placements/applications/${query}`, token);
    return Array.isArray(res) ? res : res.results || [];
  },

  updateApplicationStatus: async (
    token: string,
    applicationId: number,
    status: string
  ): Promise<PlacementApplication> => {
    return fetchWithAuth<PlacementApplication>(
      `/api/placements/applications/${applicationId}/`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
  },

  // TPO: Student Master
  getTPOStudents: async (
    token: string,
    params?: {
      search?: string;
      department?: string;
      is_placed?: boolean;
      min_cgpa?: number;
      max_backlogs?: number;
    }
  ): Promise<StudentProfile[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.department) q.set('department', params.department);
    if (params?.is_placed !== undefined) q.set('is_placed', String(params.is_placed));
    if (params?.min_cgpa !== undefined) q.set('min_cgpa', String(params.min_cgpa));
    if (params?.max_backlogs !== undefined) q.set('max_backlogs', String(params.max_backlogs));
    const query = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchWithAuth<any>(`/api/placements/students/${query}`, token);
    return Array.isArray(res) ? res : res.results || [];
  },

  // TPO: Reports
  getTPOReports: async (token: string): Promise<TPOReports> => {
    return fetchWithAuth<TPOReports>('/api/placements/reports/', token);
  },
};

// Named exports for backward compatibility
export const fetchDepartments = institutionalApi.getDepartments;
export const createDepartment = institutionalApi.createDepartment;
export const fetchAdminUsers = institutionalApi.getUsers;
export const toggleUserActive = institutionalApi.toggleUserActive;
export const fetchAdminStudents = institutionalApi.getStudents;
export const fetchAdminFaculty = institutionalApi.getFaculty;
export const fetchApprovalRequests = institutionalApi.getApprovals;
export const fetchOpportunities = institutionalApi.getOpportunities;
export const createOpportunity = institutionalApi.createOpportunity;
export const fetchCompanies = institutionalApi.getCompanies;
export const createCompany = institutionalApi.createCompany;
export const fetchPlacementDrives = institutionalApi.getPlacementDrives;
export const createPlacementDrive = institutionalApi.createPlacementDrive;
export const fetchAdminAnalytics = institutionalApi.getAdminAnalytics;
export const fetchAuditLogs = institutionalApi.getAuditLogs;
export const fetchSystemSettings = institutionalApi.getSystemSettings;
