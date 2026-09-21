from rest_framework import permissions


class IsStudent(permissions.BasePermission):
    """Allows access only to authenticated students."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'student'
        )


class IsClubLeader(permissions.BasePermission):
    """Allows access to authenticated club leaders and admins."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ('club_leader', 'admin')
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """Allows read access to everyone; write access requires admin or staff."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == 'admin' or request.user.is_staff)
        )
