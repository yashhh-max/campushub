from rest_framework import permissions


class CanCreateEvent(permissions.BasePermission):
    """
    Allows event creation only to authenticated users with authorized roles:
    Club Leaders, Admins, Staff, or students who lead an approved club.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(
            user.role in ('club_leader', 'admin') or
            user.is_staff or
            user.led_clubs.filter(is_approved=True).exists()
        )


class IsEventOrganizerOrAdmin(permissions.BasePermission):
    """
    Object-level permission allowing only the event creator,
    the host club's leader, or administrators/staff to edit or delete the event,
    or view full attendee rosters.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(
            user == obj.created_by or
            (obj.club and user == obj.club.leader) or
            user.role == 'admin' or
            user.is_staff
        )


class CanViewAttendees(permissions.BasePermission):
    """
    Allows viewing the attendee list only to event organizer,
    club leader, or admin/staff.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(
            user == obj.created_by or
            (obj.club and user == obj.club.leader) or
            user.role == 'admin' or
            user.is_staff
        )


class CanCreateClub(permissions.BasePermission):
    """
    Allows club creation for Club Leaders, Admins, or Staff.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(
            user.role in ('club_leader', 'admin') or
            user.is_staff
        )


class IsClubLeaderOrAdmin(permissions.BasePermission):
    """
    Allows club modification and member management only to the club's primary leader,
    executive officers (president/vice_president), or platform administrators.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role == 'admin' or user.is_staff:
            return True

        club = obj if hasattr(obj, 'memberships') else getattr(obj, 'club', None)
        if not club:
            return False

        if club.leader == user:
            return True

        return club.memberships.filter(
            user=user,
            role__in=['president', 'vice_president'],
            status='approved'
        ).exists()


class IsClubMemberOrLeader(permissions.BasePermission):
    """
    Verifies that the user has an active, approved membership in the club,
    or is in club leadership, or is an admin.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role == 'admin' or user.is_staff:
            return True

        club = obj if hasattr(obj, 'memberships') else getattr(obj, 'club', None)
        if not club:
            return False

        if club.leader == user:
            return True

        return club.memberships.filter(
            user=user,
            status='approved'
        ).exists()


class CanManageClubPost(permissions.BasePermission):
    """
    Allows post authors to edit/delete their own posts.
    Club leadership and platform administrators can moderate (edit/delete) any post.
    Non-members can only read public posts.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user

        # View permission: member-only posts require authenticated club membership or leadership
        if request.method in permissions.SAFE_METHODS:
            if not obj.is_members_only:
                return True
            if not user or not user.is_authenticated:
                return False
            if user.role == 'admin' or user.is_staff:
                return True
            if obj.club.leader == user:
                return True
            return obj.club.memberships.filter(user=user, status='approved').exists()

        # Mutation permission: author or club leadership or admin
        if not user or not user.is_authenticated:
            return False
        if user == obj.author:
            return True
        if user.role == 'admin' or user.is_staff:
            return True
        if obj.club.leader == user:
            return True
        return obj.club.memberships.filter(
            user=user,
            role__in=['president', 'vice_president', 'moderator'],
            status='approved'
        ).exists()


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permits read-only access to all requests.
    Requires administrator or staff privileges for write/modification methods.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        return bool(
            user and user.is_authenticated and (
                user.role == 'admin' or user.is_staff or user.is_superuser
            )
        )


class CanManageAnnouncement(permissions.BasePermission):
    """
    Allows only college administrators and staff to create, update, or delete announcements.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        return bool(
            user and user.is_authenticated and (
                user.role == 'admin' or user.is_staff or user.is_superuser
            )
        )

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        return bool(
            user and user.is_authenticated and (
                user.role == 'admin' or user.is_staff or user.is_superuser
            )
        )


class IsNotificationRecipient(permissions.BasePermission):
    """
    Enforces strict isolation for student notifications:
    Only the designated recipient can read, mark read, or delete their notifications.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return bool(
            request.user and request.user.is_authenticated and
            obj.recipient == request.user
        )


