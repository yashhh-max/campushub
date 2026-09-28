import { User, UserRole } from '@/types/auth';

export const PERMISSIONS = {
  USER_VIEW: 'USER_VIEW',
  USER_EDIT: 'USER_EDIT',
  USER_DISABLE: 'USER_DISABLE',
  EVENT_CREATE: 'EVENT_CREATE',
  EVENT_EDIT: 'EVENT_EDIT',
  EVENT_APPROVE: 'EVENT_APPROVE',
  EVENT_PUBLISH: 'EVENT_PUBLISH',
  EVENT_DELETE: 'EVENT_DELETE',
  CLUB_CREATE: 'CLUB_CREATE',
  CLUB_APPROVE: 'CLUB_APPROVE',
  CLUB_MANAGE: 'CLUB_MANAGE',
  ANNOUNCEMENT_CREATE: 'ANNOUNCEMENT_CREATE',
  ANNOUNCEMENT_APPROVE: 'ANNOUNCEMENT_APPROVE',
  ANNOUNCEMENT_PUBLISH: 'ANNOUNCEMENT_PUBLISH',
  OPPORTUNITY_CREATE: 'OPPORTUNITY_CREATE',
  OPPORTUNITY_APPROVE: 'OPPORTUNITY_APPROVE',
  OPPORTUNITY_MANAGE: 'OPPORTUNITY_MANAGE',
  PLACEMENT_CREATE: 'PLACEMENT_CREATE',
  PLACEMENT_EDIT: 'PLACEMENT_EDIT',
  PLACEMENT_VIEW: 'PLACEMENT_VIEW',
  REPORT_VIEW: 'REPORT_VIEW',
  AUDIT_VIEW: 'AUDIT_VIEW',
  SYSTEM_SETTINGS: 'SYSTEM_SETTINGS',
} as const;

export type PermissionName = keyof typeof PERMISSIONS;

export function hasPermission(user: User | null, perm: PermissionName | string): boolean {
  if (!user) return false;
  if (user.is_superuser || user.role === 'super_admin' || user.role === 'admin') return true;
  if (!user.permissions) return false;
  return user.permissions.includes(perm);
}

export function isInstitutionalAdmin(user: User | null): boolean {
  if (!user) return false;
  return (
    user.is_superuser ||
    user.role === 'super_admin' ||
    user.role === 'college_admin' ||
    user.role === 'tpo_admin' ||
    user.role === 'department_admin' ||
    user.role === 'admin' ||
    user.is_staff
  );
}

export function isCollegeAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.is_superuser || user.role === 'super_admin' || user.role === 'college_admin' || user.role === 'admin';
}

export function isTPOAdmin(user: User | null): boolean {
  if (!user) return false;
  return (
    user.is_superuser ||
    user.role === 'super_admin' ||
    user.role === 'college_admin' ||
    user.role === 'tpo_admin' ||
    user.role === 'admin'
  );
}

export function isDepartmentAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'department_admin' || isCollegeAdmin(user);
}

export function isFaculty(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'faculty' || user.role === 'department_admin' || isCollegeAdmin(user);
}

export function isClubCoordinator(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'club_coordinator' || user.role === 'club_leader' || isCollegeAdmin(user);
}

export function getRoleBadgeStyle(role: UserRole | string): { label: string; className: string } {
  switch (role) {
    case 'super_admin':
      return { label: 'Super Admin', className: 'bg-rose-500/10 text-rose-400 border border-rose-500/30' };
    case 'college_admin':
    case 'admin':
      return { label: 'College Admin', className: 'bg-purple-500/10 text-purple-400 border border-purple-500/30' };
    case 'tpo_admin':
      return { label: 'TPO Admin', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' };
    case 'department_admin':
      return { label: 'Dept Admin', className: 'bg-blue-500/10 text-blue-400 border border-blue-500/30' };
    case 'faculty':
      return { label: 'Faculty', className: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' };
    case 'club_coordinator':
    case 'club_leader':
      return { label: 'Club Coordinator', className: 'bg-amber-500/10 text-amber-400 border border-amber-500/30' };
    case 'student':
    default:
      return { label: 'Student', className: 'bg-slate-500/10 text-slate-300 border border-slate-500/30' };
  }
}
