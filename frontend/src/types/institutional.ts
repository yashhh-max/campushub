import { UserRole } from './auth';

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  hod_name: string;
  contact_email: string;
  contact_phone?: string;
  building_location?: string;
  is_active: boolean;
  students_count?: number;
  student_count?: number;
  faculty_count: number;
  created_at: string;
  updated_at: string;
}

export type OpportunityType =
  | 'internship'
  | 'hackathon'
  | 'workshop'
  | 'competition'
  | 'scholarship'
  | 'certification'
  | 'placement';

export type LifecycleStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'published'
  | 'closed'
  | 'cancelled';

export interface Opportunity {
  id: number;
  title: string;
  organization: string;
  opportunity_type: OpportunityType;
  description: string;
  location?: string;
  stipend_or_prize?: string;
  deadline?: string | null;
  apply_url?: string;
  eligibility_criteria?: string;
  department?: string;
  status?: LifecycleStatus | string;
  applications_count?: number;
  has_applied?: boolean;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OpportunityApplication {
  id: number;
  opportunity: number;
  opportunity_title: string;
  opportunity_org: string;
  student: number;
  student_name: string;
  student_email: string;
  student_roll: string;
  student_dept: string;
  student_cgpa?: number | null;
  resume_url?: string;
  notes?: string;
  status: 'applied' | 'reviewed' | 'shortlisted' | 'rejected' | string;
  applied_at: string;
}

export type ApprovalItemType = 'event' | 'club' | 'announcement' | 'opportunity' | 'coordinator_request' | string;
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested' | string;

export interface ApprovalRequest {
  id: number;
  item_type: ApprovalItemType;
  item_id: number;
  title: string;
  summary?: string;
  requested_by?: number;
  requested_by_name?: string;
  requested_by_email?: string;
  submitted_by_name?: string;
  status: ApprovalStatus;
  reviewer?: number | null;
  reviewed_by_name?: string;
  reviewer_name?: string;
  reviewer_notes?: string;
  review_comments?: string;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalActionPayload {
  action: 'approve' | 'reject' | 'request_changes' | string;
  notes?: string;
  comments?: string;
}

export interface AuditLog {
  id: number;
  actor?: number | null;
  actor_name: string;
  actor_email: string;
  actor_role?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, any>;
  ip_address: string;
  user_agent?: string;
  created_at: string;
}

export interface SystemSetting {
  id: number;
  key?: string;
  institution_name?: string;
  academic_year?: string;
  current_semester?: string;
  is_placement_season_active?: boolean;
  is_maintenance_mode?: boolean;
  emergency_notice_banner?: string;
  value?: Record<string, any>;
  description?: string;
  updated_at?: string;
  updated_by_name?: string;
}

export interface Company {
  id: number;
  name: string;
  industry: string;
  tier: 'MARQUEE' | 'TIER_1' | 'TIER_2' | 'STANDARD' | 'Super Dream' | 'Dream' | 'Tier 1' | 'Tier 2' | string;
  website?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  location?: string;
  logo_url?: string;
  is_active: boolean;
  active_drives_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PlacementDrive {
  id: number;
  company?: any; // can be number or Company object { id, name, tier, ... }
  company_name?: string;
  company_tier?: string;
  company_logo_url?: string;
  title: string;
  job_role: string;
  job_description?: string;
  package_lpa?: number;
  package_details?: string;
  location?: string;
  drive_date?: string | null;
  application_deadline?: string;
  registration_deadline?: string;
  eligibility_min_cgpa?: number;
  min_cgpa?: number;
  eligibility_max_backlogs?: number;
  max_backlogs?: number;
  eligibility_departments?: string[] | string;
  eligibility_graduation_year?: number;
  status: 'draft' | 'active' | 'in_progress' | 'completed' | 'cancelled' | 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | string;
  venue_or_link?: string;
  rounds_description?: string;
  selection_process?: string;
  applications_count?: number;
  selected_count?: number;
  is_eligible?: boolean;
  ineligibility_reasons?: string[];
  has_applied?: boolean;
  user_application_status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PlacementApplication {
  id: number;
  drive?: any;
  drive_title?: string;
  company_name?: string;
  package_lpa?: number;
  student?: any; // number or StudentProfile
  student_name?: string;
  student_email?: string;
  student_roll?: string;
  student_dept?: string;
  student_cgpa?: number | null;
  student_backlogs?: number;
  status: 'applied' | 'shortlisted' | 'interview_scheduled' | 'selected' | 'rejected' | 'APPLIED' | 'SHORTLISTED' | 'INTERVIEW_SCHEDULED' | 'OFFERED' | 'REJECTED' | string;
  cgpa_at_application?: number | null;
  resume_url?: string;
  status_notes?: string;
  applied_at?: string;
  updated_at?: string;
}

export interface PlacementInterview {
  id: number;
  application: number;
  candidate_name: string;
  candidate_email: string;
  candidate_roll: string;
  company_name: string;
  drive_role: string;
  round_name: string;
  scheduled_at: string;
  mode: 'online' | 'offline';
  venue_or_link?: string;
  interviewer_notes?: string;
  status: 'scheduled' | 'cleared' | 'failed' | 'absent';
  created_at: string;
  updated_at: string;
}

export interface AdminAnalyticsMetrics {
  total_students: number;
  total_faculty: number;
  total_clubs: number;
  pending_clubs?: number;
  total_events: number;
  published_events?: number;
  total_rsvps?: number;
  event_registrations?: number;
  checked_in_attendance?: number;
  overall_attendance_rate?: number;
  attendance_rate_pct?: number;
  total_companies?: number;
  recruiting_companies?: number;
  total_drives?: number;
  active_drives?: number;
  active_placement_drives?: number;
  placed_students?: number;
  pending_approvals?: number;
  total_opportunities?: number;
}

export interface AdminAnalytics {
  kpis: AdminAnalyticsMetrics;
  metrics?: AdminAnalyticsMetrics;
  event_category_distribution?: { category: string; count: number }[];
  department_distribution: { code?: string; name?: string; department?: string; count?: number; student_count: number }[];
}

export interface TPOReports {
  total_registered_students?: number;
  total_students?: number;
  total_eligible_students?: number;
  total_placed_students?: number;
  placed_students?: number;
  placement_rate_pct?: number;
  placement_rate?: number;
  total_companies?: number;
  recruiting_companies?: number;
  total_drives?: number;
  active_drives?: number;
  total_applications?: number;
  total_offers?: number;
  department_stats?: {
    department: string;
    total: number;
    placed: number;
    rate: number;
  }[];
  department_breakdown?: {
    department: string;
    name?: string;
    total_students: number;
    placed_students: number;
    placement_rate: number;
  }[];
}
