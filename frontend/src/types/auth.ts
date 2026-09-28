export type UserRole =
  | 'student'
  | 'faculty'
  | 'club_coordinator'
  | 'department_admin'
  | 'tpo_admin'
  | 'college_admin'
  | 'super_admin'
  | 'club_leader'
  | 'admin'
  | 'STUDENT'
  | 'FACULTY'
  | 'CLUB_COORDINATOR'
  | 'DEPARTMENT_ADMIN'
  | 'TPO_ADMIN'
  | 'COLLEGE_ADMIN'
  | 'SUPER_ADMIN';

export interface StudentProfile {
  id?: number;
  roll_number?: string;
  student_id?: string;
  department?: string;
  graduation_year?: number | null;
  year_of_study?: number;
  section?: string;
  cgpa?: number | null;
  backlogs?: number;
  is_placed?: boolean;
  resume_url?: string;
  bio?: string;
  user?: {
    id?: number;
    email: string;
    full_name: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface FacultyProfile {
  id?: number;
  user?: {
    id?: number;
    email: string;
    full_name: string;
  };
  employee_id: string;
  department: string | { id?: number; name?: string; code?: string; [key: string]: any };
  designation: string;
  specialization?: string;
  cabin_location?: string;
  contact_phone?: string;
  is_hod?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_staff: boolean;
  is_superuser?: boolean;
  is_active?: boolean;
  date_joined: string;
  profile?: StudentProfile;
  faculty_profile?: FacultyProfile;
  permissions?: string[];
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface RegisterPayload {
  email: string;
  full_name: string;
  password: string;
  student_id?: string;
  department?: string;
  graduation_year?: number | null;
  section?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  tokens: TokenPair;
}
