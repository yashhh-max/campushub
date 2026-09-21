export interface StudentProfile {
  student_id: string;
  department: string;
  graduation_year: number | null;
  bio: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'student' | 'club_leader' | 'admin';
  is_staff: boolean;
  date_joined: string;
  profile?: StudentProfile;
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
