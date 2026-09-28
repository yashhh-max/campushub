from rest_framework import permissions

# ==============================================================================
# Centralized Institutional RBAC Permission Matrix for KPRIT CampusHub
# ==============================================================================

# Canonical Permission Names
USER_VIEW = 'USER_VIEW'
USER_EDIT = 'USER_EDIT'
USER_DISABLE = 'USER_DISABLE'

EVENT_CREATE = 'EVENT_CREATE'
EVENT_EDIT = 'EVENT_EDIT'
EVENT_APPROVE = 'EVENT_APPROVE'
EVENT_PUBLISH = 'EVENT_PUBLISH'
EVENT_DELETE = 'EVENT_DELETE'

CLUB_CREATE = 'CLUB_CREATE'
CLUB_APPROVE = 'CLUB_APPROVE'
CLUB_MANAGE = 'CLUB_MANAGE'

ANNOUNCEMENT_CREATE = 'ANNOUNCEMENT_CREATE'
ANNOUNCEMENT_APPROVE = 'ANNOUNCEMENT_APPROVE'
ANNOUNCEMENT_PUBLISH = 'ANNOUNCEMENT_PUBLISH'

OPPORTUNITY_CREATE = 'OPPORTUNITY_CREATE'
OPPORTUNITY_APPROVE = 'OPPORTUNITY_APPROVE'
OPPORTUNITY_MANAGE = 'OPPORTUNITY_MANAGE'

PLACEMENT_CREATE = 'PLACEMENT_CREATE'
PLACEMENT_EDIT = 'PLACEMENT_EDIT'
PLACEMENT_VIEW = 'PLACEMENT_VIEW'

REPORT_VIEW = 'REPORT_VIEW'
AUDIT_VIEW = 'AUDIT_VIEW'
SYSTEM_SETTINGS = 'SYSTEM_SETTINGS'

ALL_PERMISSIONS = {
    USER_VIEW, USER_EDIT, USER_DISABLE,
    EVENT_CREATE, EVENT_EDIT, EVENT_APPROVE, EVENT_PUBLISH, EVENT_DELETE,
    CLUB_CREATE, CLUB_APPROVE, CLUB_MANAGE,
    ANNOUNCEMENT_CREATE, ANNOUNCEMENT_APPROVE, ANNOUNCEMENT_PUBLISH,
    OPPORTUNITY_CREATE, OPPORTUNITY_APPROVE, OPPORTUNITY_MANAGE,
    PLACEMENT_CREATE, PLACEMENT_EDIT, PLACEMENT_VIEW,
    REPORT_VIEW, AUDIT_VIEW, SYSTEM_SETTINGS
}

ROLE_PERMISSIONS = {
    'student': set(),
    'faculty': {
        EVENT_CREATE, EVENT_EDIT,
        ANNOUNCEMENT_CREATE,
        REPORT_VIEW,
        OPPORTUNITY_CREATE,
    },
    'club_coordinator': {
        EVENT_CREATE, EVENT_EDIT,
        CLUB_MANAGE,
        ANNOUNCEMENT_CREATE,
    },
    'club_leader': {  # Legacy alias
        EVENT_CREATE, EVENT_EDIT,
        CLUB_MANAGE,
        ANNOUNCEMENT_CREATE,
    },
    'department_admin': {
        USER_VIEW,
        EVENT_CREATE, EVENT_EDIT, EVENT_APPROVE,
        ANNOUNCEMENT_CREATE, ANNOUNCEMENT_APPROVE,
        OPPORTUNITY_CREATE, OPPORTUNITY_APPROVE,
        REPORT_VIEW,
    },
    'tpo_admin': {
        USER_VIEW,
        PLACEMENT_CREATE, PLACEMENT_EDIT, PLACEMENT_VIEW,
        OPPORTUNITY_CREATE, OPPORTUNITY_APPROVE, OPPORTUNITY_MANAGE,
        ANNOUNCEMENT_CREATE, ANNOUNCEMENT_APPROVE,
        REPORT_VIEW,
    },
    'college_admin': {
        USER_VIEW, USER_EDIT,
        EVENT_CREATE, EVENT_EDIT, EVENT_APPROVE, EVENT_PUBLISH, EVENT_DELETE,
        CLUB_CREATE, CLUB_APPROVE, CLUB_MANAGE,
        ANNOUNCEMENT_CREATE, ANNOUNCEMENT_APPROVE, ANNOUNCEMENT_PUBLISH,
        OPPORTUNITY_CREATE, OPPORTUNITY_APPROVE, OPPORTUNITY_MANAGE,
        PLACEMENT_CREATE, PLACEMENT_EDIT, PLACEMENT_VIEW,
        REPORT_VIEW, AUDIT_VIEW,
    },
    'super_admin': ALL_PERMISSIONS,
    'admin': ALL_PERMISSIONS,  # Legacy alias
}

ADMIN_ROLES = {
    'department_admin',
    'tpo_admin',
    'college_admin',
    'super_admin',
    'admin',
}


def get_user_permissions(user):
    """
    Returns the resolved list of permission strings for a user based on their role and flags.
    """
    if not user or not user.is_authenticated:
        return []
    if user.is_superuser:
        return sorted(list(ALL_PERMISSIONS))
    role = getattr(user, 'role', 'student')
    perms = ROLE_PERMISSIONS.get(role, set())
    return sorted(list(perms))


def has_permission(user, perm_name):
    """
    Checks if a user has a specific permission.
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    user_perms = get_user_permissions(user)
    return perm_name in user_perms


# ==============================================================================
# REST Framework Permission Classes
# ==============================================================================

class HasPermissionClass:
    """
    Factory creating a DRF BasePermission requiring a specific permission name.
    """
    def __init__(self, permission_name):
        self.permission_name = permission_name

    def __call__(self):
        perm_name = self.permission_name

        class DynamicPermission(permissions.BasePermission):
            def has_permission(self, request, view):
                return bool(
                    request.user and
                    request.user.is_authenticated and
                    has_permission(request.user, perm_name)
                )

        return DynamicPermission()


class IsStudent(permissions.BasePermission):
    """Allows access only to authenticated students."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'student'
        )


class IsFaculty(permissions.BasePermission):
    """Allows access to authenticated faculty."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ('faculty', 'department_admin', 'college_admin', 'super_admin', 'admin')
        )


class IsClubLeader(permissions.BasePermission):
    """Allows access to authenticated club coordinators and admins."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.role in ('club_leader', 'club_coordinator', 'college_admin', 'super_admin', 'admin') or
                request.user.is_staff or
                has_permission(request.user, CLUB_MANAGE)
            )
        )


class IsInstitutionalAdmin(permissions.BasePermission):
    """Allows access to any administrative role."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.role in ADMIN_ROLES or
                request.user.is_staff or
                request.user.is_superuser
            )
        )


class IsTPOAdmin(permissions.BasePermission):
    """Allows access to TPO administration and higher."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.role in ('tpo_admin', 'college_admin', 'super_admin', 'admin') or
                request.user.is_superuser or
                has_permission(request.user, PLACEMENT_CREATE)
            )
        )


class IsCollegeAdmin(permissions.BasePermission):
    """Allows access to College Admin and Super Admin."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.role in ('college_admin', 'super_admin', 'admin') or
                request.user.is_superuser
            )
        )


class IsSuperAdmin(permissions.BasePermission):
    """Allows access only to Super Admins."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.role in ('super_admin', 'admin') or
                request.user.is_superuser
            )
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """Allows read access to everyone; write access requires admin role."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                request.user.role in ADMIN_ROLES or
                request.user.is_staff or
                request.user.is_superuser
            )
        )
