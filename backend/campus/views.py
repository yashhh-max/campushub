import secrets
import csv
from django.http import HttpResponse
from django.contrib.auth import get_user_model
from django.db import transaction, models
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from django.core.cache import cache
from .cache_utils import cache_response

User = get_user_model()
from rest_framework.pagination import PageNumberPagination
from .models import (
    Club, Event, EventRSVP, Announcement, ClubMembership, ClubPost,
    Notification, NotificationPreference, ClubMessage, EventQuestion,
    EventQuestionUpvote, EventAnswer, EventTicket, Department,
    Opportunity, OpportunityApplication, ApprovalRequest, AuditLog,
    SystemSetting, Company, PlacementDrive, PlacementApplication,
    PlacementInterview
)
from .serializers import (
    ClubSerializer,
    ClubWriteSerializer,
    ClubMembershipSerializer,
    MyClubMembershipSerializer,
    ClubPostSerializer,
    ClubPostWriteSerializer,
    EventSerializer,
    EventWriteSerializer,
    EventAttendeeSerializer,
    MyEventRSVPSerializer,
    AnnouncementSerializer,
    AnnouncementWriteSerializer,
    NotificationSerializer,
    NotificationPreferenceSerializer,
    ClubMessageSerializer,
    EventQuestionSerializer,
    EventAnswerSerializer,
    EventTicketSerializer,
    DepartmentSerializer,
    OpportunitySerializer,
    OpportunityApplicationSerializer,
    ApprovalRequestSerializer,
    AuditLogSerializer,
    SystemSettingSerializer,
    CompanySerializer,
    PlacementDriveSerializer,
    PlacementApplicationSerializer,
    PlacementInterviewSerializer,
)
from users.permissions import (
    has_permission,
    IsInstitutionalAdmin,
    IsTPOAdmin,
    IsCollegeAdmin,
    IsSuperAdmin,
    USER_VIEW,
    USER_EDIT,
    USER_DISABLE,
    EVENT_CREATE,
    EVENT_EDIT,
    EVENT_APPROVE,
    EVENT_PUBLISH,
    EVENT_DELETE,
    CLUB_CREATE,
    CLUB_APPROVE,
    CLUB_MANAGE,
    ANNOUNCEMENT_CREATE,
    ANNOUNCEMENT_APPROVE,
    ANNOUNCEMENT_PUBLISH,
    OPPORTUNITY_CREATE,
    OPPORTUNITY_APPROVE,
    OPPORTUNITY_MANAGE,
    PLACEMENT_CREATE,
    PLACEMENT_EDIT,
    PLACEMENT_VIEW,
    REPORT_VIEW,
    AUDIT_VIEW,
    SYSTEM_SETTINGS,
)
from .permissions import (
    CanCreateEvent,
    IsEventOrganizerOrAdmin,
    CanViewAttendees,
    CanCreateClub,
    IsClubLeaderOrAdmin,
    IsClubMemberOrLeader,
    CanManageClubPost,
    CanManageAnnouncement,
    IsNotificationRecipient,
)
from users.permissions import IsAdminOrReadOnly
from .notifications import (
    notify_club_application_approved,
    notify_club_application_rejected,
    notify_event_rsvp_confirmed,
    notify_event_waitlist_joined,
    notify_event_waitlist_promoted,
    notify_announcement_published,
    notify_club_post_published,
    get_user_preferences,
)




class EventPagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = 'page_size'
    max_page_size = 50


class EventListView(generics.ListCreateAPIView):
    """
    List and create collegiate events.
    Supports ?search=, ?category=, ?upcoming=true, ?club=, date range filtering, and pagination.
    """
    pagination_class = EventPagination

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanCreateEvent()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return EventWriteSerializer
        return EventSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Event.objects.select_related('club', 'created_by')

        # Visibility rules: anonymous / non-organizers only see published events
        if user and user.is_authenticated and (user.role in ('club_leader', 'admin') or user.is_staff):
            # Organizers can see all published events OR their own drafts
            status_filter = self.request.query_params.get('status')
            if status_filter == 'draft':
                queryset = queryset.filter(models.Q(created_by=user) | models.Q(club__leader=user), is_published=False)
            elif status_filter == 'all':
                pass
            else:
                queryset = queryset.filter(models.Q(is_published=True) | models.Q(created_by=user) | models.Q(club__leader=user))
        else:
            queryset = queryset.filter(is_published=True)

        # Query Filters
        category = self.request.query_params.get('category')
        if category and category.lower() != 'all':
            queryset = queryset.filter(category__iexact=category)

        club = self.request.query_params.get('club')
        if club:
            queryset = queryset.filter(models.Q(club__id=club) | models.Q(club__slug=club))

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(title__icontains=search) |
                models.Q(description__icontains=search) |
                models.Q(location__icontains=search) |
                models.Q(club__name__icontains=search)
            )

        upcoming = self.request.query_params.get('upcoming')
        if upcoming and upcoming.lower() in ('true', '1', 'yes'):
            queryset = queryset.filter(start_time__gte=timezone.now())

        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(start_time__date__gte=start_date)

        end_date = self.request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(start_time__date__lte=end_date)

        return queryset.annotate(
            annotated_rsvp_count=models.Count('rsvps', filter=models.Q(rsvps__status='attending'), distinct=True),
            annotated_waitlist_count=models.Count('rsvps', filter=models.Q(rsvps__status='waitlist'), distinct=True),
        ).order_by('start_time')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        user = request.user
        extra_context = {}
        if user and user.is_authenticated:
            events_in_page = page if page is not None else list(queryset)
            event_ids = [e.id for e in events_in_page]
            rsvps = EventRSVP.objects.filter(user=user, event_id__in=event_ids)
            extra_context['user_rsvps'] = {r.event_id: r for r in rsvps}

        serializer_context = self.get_serializer_context()
        serializer_context.update(extra_context)

        if page is not None:
            serializer = self.get_serializer(page, many=True, context=serializer_context)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True, context=serializer_context)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        write_serializer = self.get_serializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)
        event = write_serializer.instance
        read_serializer = EventSerializer(event, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update (PATCH/PUT), or delete a specific event.
    Updating and deletion is strictly limited to the creator, club leader, or admin.
    """
    queryset = Event.objects.select_related('club', 'created_by')

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsEventOrganizerOrAdmin()]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return EventWriteSerializer
        return EventSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # If draft, verify user has view permissions
        if not instance.is_published:
            user = request.user
            if not user or not user.is_authenticated or not (
                user == instance.created_by or
                (instance.club and user == instance.club.leader) or
                user.role == 'admin' or
                user.is_staff
            ):
                return Response(
                    {"detail": "This event is currently an unpublished draft."},
                    status=status.HTTP_404_NOT_FOUND
                )
        serializer = EventSerializer(instance, context={'request': request})
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        read_serializer = EventSerializer(instance, context={'request': request})
        return Response(read_serializer.data)


class EventRSVPView(APIView):
    """
    Atomically manage RSVPs and waitlist registrations for an event.
    POST /api/events/<id>/rsvp/ -> Confirm attendance or join waitlist if full.
    DELETE /api/events/<id>/rsvp/ -> Cancel attendance or waitlist entry,
                                     automatically promoting the next eligible waitlisted student.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        with transaction.atomic():
            try:
                # Row-level lock on event to prevent race condition overbooking
                event = Event.objects.select_for_update().get(pk=pk)
            except Event.DoesNotExist:
                return Response(
                    {"detail": "Event not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Rule: Event must not have already started
            if event.has_started:
                return Response(
                    {"detail": "Cannot RSVP to an event that has already started."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check existing RSVP
            existing_rsvp = EventRSVP.objects.filter(event=event, user=request.user).first()
            if existing_rsvp:
                if existing_rsvp.status == 'attending':
                    return Response(
                        {"detail": "You have already registered for this event.", "status": "attending"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if existing_rsvp.status == 'waitlist':
                    return Response(
                        {
                            "detail": "You are already on the waitlist for this event.",
                            "status": "waitlist",
                            "waitlist_position": existing_rsvp.waitlist_position,
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Capacity check: If seats available -> confirm attending. If full -> join waitlist.
            if event.rsvp_count < event.capacity:
                if existing_rsvp:
                    existing_rsvp.status = 'attending'
                    existing_rsvp.save()
                    rsvp = existing_rsvp
                else:
                    rsvp = EventRSVP.objects.create(
                        event=event,
                        user=request.user,
                        status='attending'
                    )

                # Generate or reactivate digital ticket
                ticket, ticket_created = EventTicket.objects.get_or_create(
                    event=event,
                    attendee=request.user,
                    defaults={
                        'rsvp': rsvp,
                        'ticket_code': EventTicket.generate_ticket_code(),
                        'qr_payload': f"CH-TCK-{event.id}-{request.user.id}-{secrets.token_hex(4).upper()}",
                        'status': 'valid',
                    }
                )
                if not ticket_created and ticket.status != 'valid':
                    ticket.status = 'valid'
                    ticket.rsvp = rsvp
                    ticket.is_checked_in = False
                    ticket.checked_in_at = None
                    ticket.checked_in_by = None
                    ticket.save()

                # Trigger RSVP confirmed notification
                notify_event_rsvp_confirmed(rsvp)

                return Response(
                    {
                        "message": "RSVP confirmed successfully.",
                        "status": "attending",
                        "rsvp_id": rsvp.id,
                        "ticket_code": ticket.ticket_code,
                        "available_seats": event.available_seats,
                        "attendee_count": event.rsvp_count,
                        "waitlist_count": event.waitlist_count,
                    },
                    status=status.HTTP_200_OK
                )
            else:
                # Event is at capacity
                waitlist_requested = (
                    request.data.get('waitlist') in (True, 'true', '1') or
                    request.query_params.get('waitlist') in (True, 'true', '1')
                )
                if not waitlist_requested:
                    return Response(
                        {
                            "detail": "This event is already at full capacity.",
                            "status": "full",
                            "can_waitlist": True,
                            "available_seats": 0,
                            "attendee_count": event.rsvp_count,
                            "waitlist_count": event.waitlist_count,
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Join Waitlist
                if existing_rsvp:
                    existing_rsvp.status = 'waitlist'
                    existing_rsvp.created_at = timezone.now()
                    existing_rsvp.save()
                    rsvp = existing_rsvp
                else:
                    rsvp = EventRSVP.objects.create(
                        event=event,
                        user=request.user,
                        status='waitlist'
                    )

                # Trigger Waitlist joined notification
                notify_event_waitlist_joined(rsvp)

                pos = rsvp.waitlist_position
                return Response(
                    {
                        "message": f"Event is at capacity. You joined the waitlist at position #{pos}.",
                        "status": "waitlist",
                        "rsvp_id": rsvp.id,
                        "waitlist_position": pos,
                        "available_seats": 0,
                        "attendee_count": event.rsvp_count,
                        "waitlist_count": event.waitlist_count,
                    },
                    status=status.HTTP_200_OK
                )

    def delete(self, request, pk):
        with transaction.atomic():
            try:
                event = Event.objects.select_for_update().get(pk=pk)
            except Event.DoesNotExist:
                return Response(
                    {"detail": "Event not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            rsvp = EventRSVP.objects.filter(
                event=event,
                user=request.user,
                status__in=['attending', 'waitlist']
            ).first()

            if not rsvp:
                return Response(
                    {"detail": "No active RSVP or waitlist registration found for this event."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if event.has_started:
                return Response(
                    {"detail": "Cannot cancel registration after event has started."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            previous_status = rsvp.status
            rsvp.status = 'cancelled'
            rsvp.save()

            # Invalidate cancelled attendee's ticket
            EventTicket.objects.filter(event=event, attendee=request.user).update(status='cancelled')

            promoted_user = None
            if previous_status == 'attending':
                # Automatically promote the earliest eligible waitlist student
                next_waitlist = EventRSVP.objects.select_for_update().filter(
                    event=event,
                    status='waitlist'
                ).order_by('created_at').first()

                if next_waitlist:
                    next_waitlist.status = 'attending'
                    next_waitlist.save()

                    # Generate ticket for newly promoted student
                    promoted_ticket, _ = EventTicket.objects.get_or_create(
                        event=event,
                        attendee=next_waitlist.user,
                        defaults={
                            'rsvp': next_waitlist,
                            'ticket_code': EventTicket.generate_ticket_code(),
                            'qr_payload': f"CH-TCK-{event.id}-{next_waitlist.user.id}-{secrets.token_hex(4).upper()}",
                            'status': 'valid',
                        }
                    )
                    if promoted_ticket.status != 'valid':
                        promoted_ticket.status = 'valid'
                        promoted_ticket.rsvp = next_waitlist
                        promoted_ticket.is_checked_in = False
                        promoted_ticket.checked_in_at = None
                        promoted_ticket.checked_in_by = None
                        promoted_ticket.save()

                    # Trigger Waitlist promotion notification
                    notify_event_waitlist_promoted(next_waitlist)
                    promoted_user = {
                        "id": next_waitlist.user.id,
                        "email": next_waitlist.user.email,
                        "full_name": next_waitlist.user.full_name,
                    }


            return Response(
                {
                    "message": "RSVP cancelled successfully." if previous_status == 'attending' else "Waitlist registration cancelled successfully.",
                    "status": "cancelled",
                    "promoted_waitlist_user": promoted_user,
                    "available_seats": event.available_seats,
                    "attendee_count": event.rsvp_count,
                    "waitlist_count": event.waitlist_count,
                },
                status=status.HTTP_200_OK
            )



class MyEventsView(generics.ListAPIView):
    """
    Returns events the authenticated student has registered for.
    Supports ?status=upcoming and ?status=past.
    """
    serializer_class = MyEventRSVPSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = EventRSVP.objects.filter(user=user, status='attending').select_related(
            'event', 'event__club', 'event__created_by'
        )

        filter_type = self.request.query_params.get('filter')
        now = timezone.now()
        if filter_type == 'upcoming':
            queryset = queryset.filter(event__start_time__gte=now)
        elif filter_type == 'past':
            queryset = queryset.filter(event__start_time__lt=now)

        return queryset.order_by('event__start_time')


class EventAttendeesView(APIView):
    """
    Allows the event organizer, host club leader, or admin to inspect the attendee roster.
    """
    permission_classes = [permissions.IsAuthenticated, CanViewAttendees]

    def get(self, request, pk):
        try:
            event = Event.objects.select_related('club', 'created_by').get(pk=pk)
        except Event.DoesNotExist:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, event)

        rsvps = EventRSVP.objects.filter(event=event).select_related('user', 'user__profile').order_by('-created_at')
        serializer = EventAttendeeSerializer(rsvps, many=True)
        return Response({
            "event_id": event.id,
            "event_title": event.title,
            "capacity": event.capacity,
            "attendee_count": event.rsvp_count,
            "available_seats": event.available_seats,
            "attendees": serializer.data,
        })


class ClubPagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = 'page_size'
    max_page_size = 50


class ClubListView(generics.ListCreateAPIView):
    """
    Public directory of student clubs and organizations.
    Supports ?search=, ?category=, ordering, and pagination.
    Club leaders and admins can create clubs.
    """
    pagination_class = ClubPagination

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanCreateClub()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ClubWriteSerializer
        return ClubSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Club.objects.select_related('leader')

        # Visibility: public only sees approved clubs; staff/admins see all
        if not (user and user.is_authenticated and (user.role == 'admin' or user.is_staff)):
            queryset = queryset.filter(is_approved=True)

        category = self.request.query_params.get('category')
        if category and category.lower() != 'all':
            queryset = queryset.filter(category__iexact=category)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) |
                models.Q(description__icontains=search) |
                models.Q(location__icontains=search) |
                models.Q(tags__icontains=search)
            )

        ordering = self.request.query_params.get('ordering', 'name')
        if ordering in ('name', '-name', 'created_at', '-created_at'):
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('name')

        return queryset.annotate(
            annotated_member_count=models.Count('memberships', filter=models.Q(memberships__status='approved'), distinct=True),
            annotated_events_count=models.Count('events', distinct=True)
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        user = request.user
        extra_context = {}
        if user and user.is_authenticated:
            clubs_in_page = page if page is not None else list(queryset)
            club_ids = [c.id for c in clubs_in_page]
            memberships = ClubMembership.objects.filter(user=user, club_id__in=club_ids)
            extra_context['user_memberships'] = {m.club_id: m for m in memberships}

        serializer_context = self.get_serializer_context()
        serializer_context.update(extra_context)

        if page is not None:
            serializer = self.get_serializer(page, many=True, context=serializer_context)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True, context=serializer_context)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != 'admin' and not user.is_staff:
            club = serializer.save(leader=user, is_approved=True)
        else:
            club = serializer.save(leader=user)

        # Create founder/president membership
        ClubMembership.objects.get_or_create(
            club=club,
            user=user,
            defaults={
                'role': 'president',
                'status': 'approved',
                'title': 'Founder & President'
            }
        )

    def create(self, request, *args, **kwargs):
        write_serializer = self.get_serializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)
        club = write_serializer.instance
        read_serializer = ClubSerializer(club, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


class ClubDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific club by ID or slug.
    Only authorized leaders or platform administrators can update or delete.
    """
    queryset = Club.objects.select_related('leader')

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsClubLeaderOrAdmin()]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ClubWriteSerializer
        return ClubSerializer

    def get_object(self):
        lookup = self.kwargs.get('pk')
        if str(lookup).isdigit():
            obj = generics.get_object_or_404(Club.objects.select_related('leader'), pk=int(lookup))
        else:
            obj = generics.get_object_or_404(Club.objects.select_related('leader'), slug=lookup)

        if not obj.is_approved:
            user = self.request.user
            if not (user and user.is_authenticated and (user.role == 'admin' or user.is_staff or obj.leader == user)):
                raise permissions.exceptions.PermissionDenied("This club is awaiting administrative approval.")

        self.check_object_permissions(self.request, obj)
        return obj

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        read_serializer = ClubSerializer(instance, context={'request': request})
        return Response(read_serializer.data)


class ClubJoinView(APIView):
    """
    Join a club or apply for membership.
    If the club requires approval -> status is pending.
    If the club allows instant joining -> status is approved immediately.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if str(pk).isdigit():
            club = generics.get_object_or_404(Club, pk=int(pk), is_approved=True)
        else:
            club = generics.get_object_or_404(Club, slug=pk, is_approved=True)

        user = request.user
        membership = ClubMembership.objects.filter(club=club, user=user).first()
        if membership:
            if membership.status == 'approved':
                return Response(
                    {"detail": "You are already an active member of this club.", "status": "approved"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if membership.status == 'pending':
                return Response(
                    {"detail": "Your membership application is currently pending review.", "status": "pending"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Re-apply if previously rejected
            if club.membership_requires_approval:
                membership.status = 'pending'
                membership.role = 'member'
                membership.save()
                return Response(
                    {
                        "message": "Membership application re-submitted for review.",
                        "status": "pending",
                        "membership_id": membership.id,
                    },
                    status=status.HTTP_200_OK
                )
            else:
                membership.status = 'approved'
                membership.role = 'member'
                membership.save()
                return Response(
                    {
                        "message": "Welcome back! Membership confirmed.",
                        "status": "approved",
                        "membership_id": membership.id,
                    },
                    status=status.HTTP_200_OK
                )

        target_status = 'pending' if club.membership_requires_approval else 'approved'
        membership = ClubMembership.objects.create(
            club=club,
            user=user,
            role='member',
            status=target_status
        )

        msg = (
            "Application submitted successfully. Waiting for club leadership approval."
            if target_status == 'pending'
            else "You have joined the club successfully!"
        )

        return Response(
            {
                "message": msg,
                "status": target_status,
                "membership_id": membership.id,
                "requires_approval": club.membership_requires_approval,
            },
            status=status.HTTP_201_CREATED
        )


class ClubLeaveView(APIView):
    """
    Leave a club. Primary club leaders cannot leave without transferring leadership.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        if str(pk).isdigit():
            club = generics.get_object_or_404(Club, pk=int(pk))
        else:
            club = generics.get_object_or_404(Club, slug=pk)

        user = request.user
        if club.leader == user:
            return Response(
                {"detail": "Primary club leaders cannot leave their own club. Please transfer leadership or delete the club."},
                status=status.HTTP_400_BAD_REQUEST
            )

        membership = ClubMembership.objects.filter(club=club, user=user).first()
        if not membership or membership.status != 'approved':
            return Response(
                {"detail": "You are not an active member of this club."},
                status=status.HTTP_400_BAD_REQUEST
            )

        membership.delete()
        return Response(
            {"message": f"You have left {club.name}.", "status": "left"},
            status=status.HTTP_200_OK
        )


class MyClubsView(APIView):
    """
    Returns clubs the student belongs to, pending applications, and clubs led.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        approved_memberships = ClubMembership.objects.filter(
            user=user,
            status='approved'
        ).select_related('club', 'club__leader').order_by('club__name')

        pending_memberships = ClubMembership.objects.filter(
            user=user,
            status='pending'
        ).select_related('club', 'club__leader').order_by('-joined_at')

        led_clubs = Club.objects.filter(
            models.Q(leader=user) |
            models.Q(memberships__user=user, memberships__role__in=['president', 'vice_president'], memberships__status='approved')
        ).distinct().order_by('name')

        return Response({
            "joined_clubs": MyClubMembershipSerializer(approved_memberships, many=True, context={'request': request}).data,
            "pending_applications": MyClubMembershipSerializer(pending_memberships, many=True, context={'request': request}).data,
            "led_clubs": ClubSerializer(led_clubs, many=True, context={'request': request}).data,
        })


class ClubMembersView(APIView):
    """
    List members of a club.
    Public/normal users see approved members.
    Club leaders and admins can also see pending applications.
    """
    def get(self, request, pk):
        if str(pk).isdigit():
            club = generics.get_object_or_404(Club, pk=int(pk))
        else:
            club = generics.get_object_or_404(Club, slug=pk)

        user = request.user
        is_leader = (
            user and user.is_authenticated and (
                user.role == 'admin' or
                user.is_staff or
                club.leader == user or
                club.memberships.filter(user=user, role__in=['president', 'vice_president', 'moderator'], status='approved').exists()
            )
        )

        memberships = ClubMembership.objects.filter(club=club).select_related('user', 'user__profile')
        if not is_leader:
            memberships = memberships.filter(status='approved')

        serializer = ClubMembershipSerializer(memberships, many=True)
        return Response({
            "club_id": club.id,
            "club_name": club.name,
            "member_count": club.member_count,
            "pending_count": club.pending_applications_count if is_leader else 0,
            "is_leader": is_leader,
            "members": serializer.data,
        })


class ClubMembershipApproveView(APIView):
    """
    Approve a pending membership application.
    Enforces business rules:
    1. Must be authorized leader or admin.
    2. Users cannot approve themselves!
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, membership_id):
        if str(pk).isdigit():
            club = generics.get_object_or_404(Club, pk=int(pk))
        else:
            club = generics.get_object_or_404(Club, slug=pk)

        user = request.user
        is_leader = (
            user.role == 'admin' or
            user.is_staff or
            club.leader == user or
            club.memberships.filter(user=user, role__in=['president', 'vice_president'], status='approved').exists()
        )
        if not is_leader:
            return Response(
                {"detail": "Only club leadership or administrators can approve members."},
                status=status.HTTP_403_FORBIDDEN
            )

        membership = generics.get_object_or_404(ClubMembership, pk=membership_id, club=club)

        # Business Rule: Prevent users from approving themselves
        if membership.user == user:
            return Response(
                {"detail": "You cannot approve your own membership application."},
                status=status.HTTP_400_BAD_REQUEST
            )

        assigned_role = request.data.get('role', 'member')
        if assigned_role not in dict(ClubMembership.ROLE_CHOICES):
            assigned_role = 'member'

        membership.status = 'approved'
        membership.role = assigned_role
        if request.data.get('title'):
            membership.title = request.data.get('title')
        membership.save()

        # Trigger notification
        notify_club_application_approved(membership)

        return Response({
            "message": f"Approved {membership.user.full_name or membership.user.email} as {membership.role}.",
            "membership": ClubMembershipSerializer(membership).data,
        }, status=status.HTTP_200_OK)


class ClubMembershipRejectView(APIView):
    """
    Reject a pending membership or remove a member.
    Enforces business rules:
    1. Must be authorized leader or admin.
    2. Cannot reject primary club leader.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, membership_id):
        if str(pk).isdigit():
            club = generics.get_object_or_404(Club, pk=int(pk))
        else:
            club = generics.get_object_or_404(Club, slug=pk)

        user = request.user
        is_leader = (
            user.role == 'admin' or
            user.is_staff or
            club.leader == user or
            club.memberships.filter(user=user, role__in=['president', 'vice_president'], status='approved').exists()
        )
        if not is_leader:
            return Response(
                {"detail": "Only club leadership or administrators can reject members."},
                status=status.HTTP_403_FORBIDDEN
            )

        membership = generics.get_object_or_404(ClubMembership, pk=membership_id, club=club)

        if membership.user == club.leader:
            return Response(
                {"detail": "The primary club leader cannot be rejected or removed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        membership.status = 'rejected'
        membership.save()

        # Trigger notification
        notify_club_application_rejected(membership)

        return Response({
            "message": f"Membership for {membership.user.full_name or membership.user.email} set to rejected.",
            "membership_id": membership.id,
            "status": "rejected",
        }, status=status.HTTP_200_OK)


class ClubPostListCreateView(APIView):
    """
    List community posts for a club or create a new post.
    Public users can view public posts.
    Approved members and leaders can view member-only posts.
    Leaders can publish announcements and updates.
    Members and leaders can publish discussions.
    """
    def get(self, request, pk):
        if str(pk).isdigit():
            club = generics.get_object_or_404(Club, pk=int(pk))
        else:
            club = generics.get_object_or_404(Club, slug=pk)

        user = request.user
        is_member_or_leader = (
            user and user.is_authenticated and (
                user.role == 'admin' or
                user.is_staff or
                club.leader == user or
                club.memberships.filter(user=user, status='approved').exists()
            )
        )

        queryset = ClubPost.objects.filter(club=club).select_related('author', 'author__profile', 'club')
        if not is_member_or_leader:
            queryset = queryset.filter(is_members_only=False)

        post_type = request.query_params.get('post_type')
        if post_type:
            queryset = queryset.filter(post_type=post_type)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(title__icontains=search) |
                models.Q(content__icontains=search)
            )

        serializer = ClubPostSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, pk):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required to post."}, status=status.HTTP_401_UNAUTHORIZED)

        if str(pk).isdigit():
            club = generics.get_object_or_404(Club, pk=int(pk))
        else:
            club = generics.get_object_or_404(Club, slug=pk)

        user = request.user
        is_member = club.memberships.filter(user=user, status='approved').exists()
        is_leader = (
            user.role == 'admin' or
            user.is_staff or
            club.leader == user or
            club.memberships.filter(user=user, role__in=['president', 'vice_president', 'moderator'], status='approved').exists()
        )

        if not (is_member or is_leader):
            return Response({"detail": "You must be an approved member of this club to post."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ClubPostWriteSerializer(data=request.data, context={'request': request, 'club': club})
        serializer.is_valid(raise_exception=True)
        post = serializer.save(club=club, author=user)

        # Trigger notification to active club members
        notify_club_post_published(post)

        read_serializer = ClubPostSerializer(post, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)



class ClubPostDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific club post.
    Authors can edit/delete their own posts.
    Club leadership and admins can moderate any post.
    """
    queryset = ClubPost.objects.select_related('author', 'author__profile', 'club')
    permission_classes = [CanManageClubPost]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ClubPostWriteSerializer
        return ClubPostSerializer

    def get_object(self):
        post_id = self.kwargs.get('post_id')
        club_pk = self.kwargs.get('pk')
        if str(club_pk).isdigit():
            club = generics.get_object_or_404(Club, pk=int(club_pk))
        else:
            club = generics.get_object_or_404(Club, slug=club_pk)

        obj = generics.get_object_or_404(ClubPost.objects.select_related('author', 'club'), pk=post_id, club=club)
        self.check_object_permissions(self.request, obj)
        return obj

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
            context={'request': request, 'club': instance.club}
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        read_serializer = ClubPostSerializer(instance, context={'request': request})
        return Response(read_serializer.data)



class AnnouncementListView(generics.ListCreateAPIView):
    """
    Feed of official campus alerts, administrative notices, and department targeting.
    Students see active, published notices targeted to their cohort/department.
    Administrators have full access to drafts, scheduled releases, and creation.
    """
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = EventPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AnnouncementWriteSerializer
        return AnnouncementSerializer

    def get_queryset(self):
        user = self.request.user
        is_admin = bool(
            user and user.is_authenticated and (
                user.role == 'admin' or user.is_staff or user.is_superuser
            )
        )

        if is_admin:
            queryset = Announcement.objects.all().select_related('author')

            # Admin status filter: draft, scheduled, published, expired, all
            status_filter = self.request.query_params.get('status')
            now = timezone.now()
            if status_filter == 'draft':
                queryset = queryset.filter(is_published=False)
            elif status_filter == 'scheduled':
                queryset = queryset.filter(is_published=True, scheduled_at__gt=now)
            elif status_filter == 'expired':
                queryset = queryset.filter(is_published=True, expires_at__lte=now)
            elif status_filter == 'published':
                queryset = queryset.filter(is_published=True).filter(
                    models.Q(scheduled_at__isnull=True) | models.Q(scheduled_at__lte=now)
                ).filter(
                    models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now)
                )

            target_aud = self.request.query_params.get('target_audience')
            if target_aud:
                queryset = queryset.filter(target_audience=target_aud)
        else:
            # Regular students and public visitors: only currently active, published notices
            now = timezone.now()
            queryset = Announcement.objects.filter(is_published=True).filter(
                models.Q(scheduled_at__isnull=True) | models.Q(scheduled_at__lte=now)
            ).filter(
                models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now)
            ).select_related('author')

            if not user or not user.is_authenticated:
                queryset = queryset.filter(target_audience='everyone')
            else:
                profile = getattr(user, 'profile', None)
                dept = profile.department.strip() if profile and profile.department else ''
                grad_year = profile.graduation_year if profile else None

                q_aud = models.Q(target_audience='everyone')
                if dept:
                    q_aud |= models.Q(target_audience='department', target_department__iexact=dept)
                if grad_year:
                    q_aud |= models.Q(target_audience='graduation_year', target_graduation_year=grad_year)
                if dept and grad_year:
                    q_aud |= models.Q(target_audience='both', target_department__iexact=dept, target_graduation_year=grad_year)
                queryset = queryset.filter(q_aud)

        # Filters common to both
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority__iexact=priority)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(title__icontains=search) |
                models.Q(content__icontains=search)
            )

        return queryset.order_by('-published_at', '-created_at')

    def create(self, request, *args, **kwargs):
        if not (request.user.is_authenticated and (request.user.role == 'admin' or request.user.is_staff or request.user.is_superuser)):
            return Response(
                {"detail": "Only authorized college administrators can create campus announcements."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save(author=request.user)

        # Automatic trigger: if active immediately, notify eligible audience
        if announcement.is_published and announcement.is_currently_active:
            notify_announcement_published(announcement)

        read_serializer = AnnouncementSerializer(announcement)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


class AnnouncementDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific announcement.
    Only authorized administrators can edit or delete announcements.
    """
    permission_classes = [IsAdminOrReadOnly]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return AnnouncementWriteSerializer
        return AnnouncementSerializer

    def get_object(self):
        obj = generics.get_object_or_404(Announcement.objects.select_related('author'), pk=self.kwargs.get('pk'))
        user = self.request.user
        is_admin = bool(
            user and user.is_authenticated and (
                user.role == 'admin' or user.is_staff or user.is_superuser
            )
        )
        if not is_admin:
            if not obj.is_currently_active or not obj.is_targeted_to_user(user):
                from rest_framework.exceptions import NotFound
                raise NotFound("Announcement not found or unavailable.")

        self.check_object_permissions(self.request, obj)
        return obj

    def update(self, request, *args, **kwargs):
        if not (request.user.is_authenticated and (request.user.role == 'admin' or request.user.is_staff or request.user.is_superuser)):
            return Response(
                {"detail": "Only authorized college administrators can edit campus announcements."},
                status=status.HTTP_403_FORBIDDEN
            )

        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        was_active = instance.is_currently_active

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save()

        # If activated upon update, trigger notifications
        if not was_active and announcement.is_currently_active:
            notify_announcement_published(announcement)

        read_serializer = AnnouncementSerializer(announcement)
        return Response(read_serializer.data)

    def delete(self, request, *args, **kwargs):
        if not (request.user.is_authenticated and (request.user.role == 'admin' or request.user.is_staff or request.user.is_superuser)):
            return Response(
                {"detail": "Only authorized college administrators can delete campus announcements."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().delete(request, *args, **kwargs)


class NotificationListView(generics.ListAPIView):
    """
    Returns paginated notifications for the authenticated student,
    ordered newest first. Supports filtering by read status and type.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer
    pagination_class = EventPagination

    def get_queryset(self):
        user = self.request.user
        queryset = Notification.objects.filter(recipient=user).select_related(
            'related_event', 'related_club', 'related_announcement'
        )

        is_read = self.request.query_params.get('is_read')
        if is_read in ('true', '1'):
            queryset = queryset.filter(is_read=True)
        elif is_read in ('false', '0'):
            queryset = queryset.filter(is_read=False)

        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)

        return queryset.order_by('-created_at')


class NotificationUnreadCountView(APIView):
    """
    Quick count endpoint for the navbar notification bell badge.
    Utilizes Redis cache (60s TTL) to prevent query flooding at 10,000 users.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cache_key = f"user_unread_notif_{request.user.id}"
        unread_count = cache.get(cache_key)
        if unread_count is None:
            unread_count = Notification.objects.filter(
                recipient=request.user,
                is_read=False
            ).count()
            cache.set(cache_key, unread_count, timeout=60)
        return Response({"unread_count": unread_count})


class NotificationMarkReadView(APIView):
    """
    Mark an individual notification as read.
    Recipient isolation enforced.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notification = generics.get_object_or_404(
            Notification,
            pk=pk,
            recipient=request.user
        )
        notification.is_read = True
        notification.save()
        cache.delete(f"user_unread_notif_{request.user.id}")
        return Response({
            "message": "Notification marked as read.",
            "notification": NotificationSerializer(notification).data
        }, status=status.HTTP_200_OK)


class NotificationMarkAllReadView(APIView):
    """
    Mark all unread notifications for the authenticated user as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(is_read=True)
        cache.delete(f"user_unread_notif_{request.user.id}")
        return Response({
            "message": f"{updated_count} notifications marked as read.",
            "unread_count": 0
        }, status=status.HTTP_200_OK)


class NotificationDeleteView(APIView):
    """
    Delete a notification. Recipient isolation enforced.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        notification = generics.get_object_or_404(
            Notification,
            pk=pk,
            recipient=request.user
        )
        notif_id = notification.id
        notification.delete()
        return Response(
            {"message": "Notification deleted successfully.", "id": notif_id},
            status=status.HTTP_200_OK
        )


class NotificationPreferenceView(APIView):
    """
    View and update notification preferences for the authenticated student.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        prefs = get_user_preferences(request.user)
        return Response(NotificationPreferenceSerializer(prefs).data)

    def patch(self, request):
        prefs = get_user_preferences(request.user)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


# ==============================================================================
# PHASE 6: REAL-TIME COMMUNITY, EVENT Q&A & QR ATTENDANCE VIEWS
# ==============================================================================

class ClubMessageListView(APIView):
    """
    Fetch message history for a club chat room.
    Restricted to approved club members, leaders, and admins.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk_or_slug):
        if str(pk_or_slug).isdigit():
            club = generics.get_object_or_404(Club, id=int(pk_or_slug))
        else:
            club = generics.get_object_or_404(Club, slug=pk_or_slug)

        user = request.user
        is_authorized = (
            user.is_staff or
            user.role == 'admin' or
            club.leader == user or
            ClubMembership.objects.filter(club=club, user=user, status='approved').exists()
        )
        if not is_authorized:
            return Response(
                {"detail": "You must be an approved member to access club chat."},
                status=status.HTTP_403_FORBIDDEN
            )

        messages = club.messages.select_related('sender').order_by('-created_at')[:50]
        serializer = ClubMessageSerializer(
            reversed(messages),
            many=True,
            context={'request': request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class EventQuestionListCreateView(APIView):
    """
    List questions for an event, or submit a new question.
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get(self, request, event_id):
        event = generics.get_object_or_404(Event, pk=event_id)
        questions = (
            event.questions
            .select_related('author')
            .prefetch_related('answers__author', 'upvotes')
            .order_by('-is_pinned', '-created_at')
        )
        serializer = EventQuestionSerializer(questions, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, event_id):
        event = generics.get_object_or_404(Event, pk=event_id)
        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({"content": "Question content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        question = EventQuestion.objects.create(
            event=event,
            author=request.user,
            content=content,
        )
        data = EventQuestionSerializer(question, context={'request': request}).data

        # Real-Time WebSocket broadcast
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"event_{event.id}_qa",
                    {
                        "type": "qa_question_created",
                        "question": data,
                    }
                )
        except Exception:
            pass

        return Response(data, status=status.HTTP_201_CREATED)


class EventQuestionAnswerView(APIView):
    """
    Post an answer to an event question.
    Organizers and officers can post official answers.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, question_id):
        question = generics.get_object_or_404(
            EventQuestion.objects.select_related('event__club', 'event__created_by'),
            pk=question_id
        )
        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({"content": "Answer content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        event = question.event
        is_official = bool(
            user.is_staff or
            user.role == 'admin' or
            user == event.created_by or
            user == event.club.leader or
            event.club.memberships.filter(
                user=user,
                status='approved',
                role__in=['moderator', 'vice_president', 'president']
            ).exists()
        )

        answer = EventAnswer.objects.create(
            question=question,
            author=user,
            content=content,
            is_official=is_official,
        )
        data = EventAnswerSerializer(answer, context={'request': request}).data

        # Real-Time WebSocket broadcast
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"event_{event.id}_qa",
                    {
                        "type": "qa_answer_created",
                        "question_id": question.id,
                        "answer": data,
                    }
                )
        except Exception:
            pass

        return Response(data, status=status.HTTP_201_CREATED)


class EventQuestionUpvoteView(APIView):
    """
    Toggle upvote for a question.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, question_id):
        question = generics.get_object_or_404(EventQuestion, pk=question_id)
        upvote = EventQuestionUpvote.objects.filter(question=question, user=request.user).first()
        if upvote:
            upvote.delete()
            has_upvoted = False
        else:
            EventQuestionUpvote.objects.create(question=question, user=request.user)
            has_upvoted = True

        upvotes_count = question.upvotes.count()

        # Real-Time WebSocket broadcast
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"event_{question.event_id}_qa",
                    {
                        "type": "qa_question_upvoted",
                        "question_id": question.id,
                        "upvotes_count": upvotes_count,
                    }
                )
        except Exception:
            pass

        return Response({
            "question_id": question.id,
            "has_upvoted": has_upvoted,
            "upvotes_count": upvotes_count,
        }, status=status.HTTP_200_OK)


class EventTicketListView(generics.ListAPIView):
    """
    Returns tickets belonging to the authenticated student.
    Supports filtering by ?status=valid|used|cancelled.
    """
    serializer_class = EventTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = (
            EventTicket.objects
            .filter(attendee=self.request.user)
            .select_related('event__club', 'attendee')
            .order_by('-issued_at')
        )
        status_param = self.request.query_params.get('status')
        if status_param in ('valid', 'used', 'cancelled'):
            qs = qs.filter(status=status_param)
        return qs


class EventTicketDetailView(APIView):
    """
    Retrieve single ticket detail with vector SVG QR code.
    Accessible to attendee or event organizer.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, code_or_id):
        if str(code_or_id).isdigit():
            ticket = generics.get_object_or_404(
                EventTicket.objects.select_related('event__club', 'attendee'),
                pk=int(code_or_id)
            )
        else:
            ticket = generics.get_object_or_404(
                EventTicket.objects.select_related('event__club', 'attendee'),
                ticket_code=code_or_id
            )

        user = request.user
        event = ticket.event
        is_authorized = (
            ticket.attendee == user or
            user.is_staff or
            user.role == 'admin' or
            user == event.created_by or
            user == event.club.leader
        )
        if not is_authorized:
            return Response(
                {"detail": "You do not have permission to view this ticket."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = EventTicketSerializer(ticket, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class EventCheckInView(APIView):
    """
    Validate and mark an event ticket as checked in.
    Server-side concurrency-safe scan validation.
    Restricted to event organizers, club officers, and administrators.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, event_id):
        event = generics.get_object_or_404(Event.objects.select_related('club'), pk=event_id)
        user = request.user

        # Organizer permission verification
        is_authorized = (
            user.is_staff or
            user.role == 'admin' or
            user == event.created_by or
            user == event.club.leader or
            event.club.memberships.filter(
                user=user,
                status='approved',
                role__in=['moderator', 'vice_president', 'president']
            ).exists()
        )
        if not is_authorized:
            return Response(
                {"detail": "Only event organizers can check in attendees."},
                status=status.HTTP_403_FORBIDDEN
            )

        ticket_code = (request.data.get('ticket_code') or '').strip()
        qr_payload = (request.data.get('qr_payload') or '').strip()

        if not ticket_code and not qr_payload:
            return Response(
                {"detail": "Ticket code or QR payload is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Concurrency-safe ticket lock
            ticket_qs = EventTicket.objects.select_for_update().filter(event=event)
            if ticket_code:
                ticket = ticket_qs.filter(ticket_code=ticket_code).select_related('attendee', 'event').first()
            else:
                ticket = ticket_qs.filter(qr_payload=qr_payload).select_related('attendee', 'event').first()

            if not ticket:
                # Check if ticket belongs to a different event
                other_ticket = EventTicket.objects.filter(models.Q(ticket_code=ticket_code) | models.Q(qr_payload=qr_payload)).first()
                if other_ticket:
                    return Response(
                        {
                            "detail": f"This ticket belongs to '{other_ticket.event.title}', not this event.",
                            "error_code": "WRONG_EVENT",
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                return Response(
                    {"detail": "Invalid ticket code. No matching registration found.", "error_code": "INVALID_TICKET"},
                    status=status.HTTP_404_NOT_FOUND
                )

            if ticket.status == 'cancelled':
                return Response(
                    {
                        "detail": "This ticket was cancelled by the attendee or refunded.",
                        "error_code": "CANCELLED_TICKET",
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if ticket.is_checked_in:
                registered_count = EventRSVP.objects.filter(event=event, status='attending').count()
                checked_in_count = EventTicket.objects.filter(event=event, is_checked_in=True).count()
                return Response(
                    {
                        "message": f"Attendee already checked in on {ticket.checked_in_at.strftime('%b %d, %Y at %I:%M %p')}.",
                        "detail": f"Duplicate scan: Attendee was already checked in on {ticket.checked_in_at.strftime('%b %d, %Y at %I:%M %p')}.",
                        "error_code": "ALREADY_CHECKED_IN",
                        "duplicate": True,
                        "ticket_code": ticket.ticket_code,
                        "attendee": {
                            "id": ticket.attendee.id,
                            "name": ticket.attendee.full_name,
                            "email": ticket.attendee.email,
                            "ticket_code": ticket.ticket_code,
                            "checked_in_at": ticket.checked_in_at.isoformat(),
                        },
                        "checked_in_count": checked_in_count,
                        "registered_count": registered_count,
                    },
                    status=status.HTTP_200_OK
                )

            # Mark checked in
            ticket.is_checked_in = True
            ticket.status = 'used'
            ticket.checked_in_at = timezone.now()
            ticket.checked_in_by = user
            ticket.save(update_fields=['is_checked_in', 'status', 'checked_in_at', 'checked_in_by'])

            # Compute updated live metrics
            registered_count = EventRSVP.objects.filter(event=event, status='attending').count()
            checked_in_count = EventTicket.objects.filter(event=event, is_checked_in=True).count()
            checkin_pct = round((checked_in_count / registered_count * 100), 1) if registered_count > 0 else 0

            attendee_data = {
                "id": ticket.attendee.id,
                "name": ticket.attendee.full_name,
                "email": ticket.attendee.email,
                "ticket_code": ticket.ticket_code,
                "checked_in_at": ticket.checked_in_at.isoformat(),
            }

            # Real-Time WebSocket broadcast to organizer dashboard
            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"event_{event.id}_attendance",
                        {
                            "type": "attendance_update",
                            "event_id": event.id,
                            "attendee": attendee_data,
                            "checked_in_count": checked_in_count,
                            "registered_count": registered_count,
                            "checkin_percentage": checkin_pct,
                        }
                    )
            except Exception:
                pass

            return Response({
                "message": "Attendee checked in successfully.",
                "duplicate": False,
                "ticket_code": ticket.ticket_code,
                "attendee": attendee_data,
                "checked_in_count": checked_in_count,
                "registered_count": registered_count,
                "checkin_percentage": checkin_pct,
            }, status=status.HTTP_200_OK)


class EventAttendanceView(APIView):
    """
    Organizer attendance dashboard metrics and attendee check-in roster.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, event_id):
        event = generics.get_object_or_404(Event.objects.select_related('club'), pk=event_id)
        user = request.user

        is_authorized = (
            user.is_staff or
            user.role == 'admin' or
            user == event.created_by or
            user == event.club.leader or
            event.club.memberships.filter(
                user=user,
                status='approved',
                role__in=['moderator', 'vice_president', 'president']
            ).exists()
        )
        if not is_authorized:
            return Response(
                {"detail": "You do not have permission to view attendance records."},
                status=status.HTTP_403_FORBIDDEN
            )

        registered_rsvps = (
            EventRSVP.objects
            .filter(event=event, status='attending')
            .select_related('user__profile')
            .order_by('created_at')
        )
        tickets = {t.attendee_id: t for t in EventTicket.objects.filter(event=event)}

        attendees = []
        for rsvp in registered_rsvps:
            u = rsvp.user
            profile = getattr(u, 'profile', None)
            t = tickets.get(u.id)
            attendees.append({
                "rsvp_id": rsvp.id,
                "user_id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "student_id": getattr(profile, 'student_id', '') or f"STU-{u.id}",
                "department": getattr(profile, 'department', '') or 'General',
                "ticket_code": t.ticket_code if t else None,
                "ticket_status": t.status if t else 'none',
                "is_checked_in": t.is_checked_in if t else False,
                "checked_in_at": t.checked_in_at.isoformat() if t and t.checked_in_at else None,
                "rsvp_time": rsvp.created_at.isoformat(),
            })

        registered_count = len(attendees)
        checked_in_count = sum(1 for a in attendees if a["is_checked_in"])
        no_show_count = max(0, registered_count - checked_in_count)
        checkin_pct = round((checked_in_count / registered_count * 100), 1) if registered_count > 0 else 0

        return Response({
            "event_id": event.id,
            "event_title": event.title,
            "capacity": event.capacity,
            "registered_count": registered_count,
            "checked_in_count": checked_in_count,
            "no_show_count": no_show_count,
            "checkin_percentage": checkin_pct,
            "attendees": attendees,
        }, status=status.HTTP_200_OK)


class EventAttendanceManualView(APIView):
    """
    Organizer manual check-in toggle for students who don't have their ticket on hand.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, event_id):
        event = generics.get_object_or_404(Event.objects.select_related('club'), pk=event_id)
        user = request.user

        is_authorized = (
            user.is_staff or
            user.role == 'admin' or
            user == event.created_by or
            user == event.club.leader or
            event.club.memberships.filter(
                user=user,
                status='approved',
                role__in=['moderator', 'vice_president', 'president']
            ).exists()
        )
        if not is_authorized:
            return Response(
                {"detail": "Unauthorized to perform check-in."},
                status=status.HTTP_403_FORBIDDEN
            )

        attendee_id = request.data.get('attendee_id')
        if not attendee_id:
            return Response({"detail": "attendee_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        attendee = generics.get_object_or_404(User, pk=attendee_id)
        rsvp = generics.get_object_or_404(EventRSVP, event=event, user=attendee, status='attending')

        ticket, _ = EventTicket.objects.get_or_create(
            event=event,
            attendee=attendee,
            defaults={
                'rsvp': rsvp,
                'ticket_code': EventTicket.generate_ticket_code(),
                'qr_payload': f"CH-TCK-{event.id}-{attendee.id}-{secrets.token_hex(4).upper()}",
                'status': 'valid',
            }
        )

        check_in_state = request.data.get('is_checked_in', True)
        if check_in_state:
            ticket.is_checked_in = True
            ticket.status = 'used'
            ticket.checked_in_at = timezone.now()
            ticket.checked_in_by = user
        else:
            ticket.is_checked_in = False
            ticket.status = 'valid'
            ticket.checked_in_at = None
            ticket.checked_in_by = None
        ticket.save()

        # Compute updated live metrics
        registered_count = EventRSVP.objects.filter(event=event, status='attending').count()
        checked_in_count = EventTicket.objects.filter(event=event, is_checked_in=True).count()
        checkin_pct = round((checked_in_count / registered_count * 100), 1) if registered_count > 0 else 0

        attendee_data = {
            "id": attendee.id,
            "name": attendee.full_name,
            "email": attendee.email,
            "ticket_code": ticket.ticket_code,
            "checked_in_at": ticket.checked_in_at.isoformat() if ticket.checked_in_at else None,
        }

        # Real-Time WebSocket broadcast
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"event_{event.id}_attendance",
                    {
                        "type": "attendance_update",
                        "event_id": event.id,
                        "attendee": attendee_data,
                        "checked_in_count": checked_in_count,
                        "registered_count": registered_count,
                        "checkin_percentage": checkin_pct,
                    }
                )
        except Exception:
            pass

        return Response({
            "message": "Check-in status updated.",
            "is_checked_in": ticket.is_checked_in,
            "checked_in_count": checked_in_count,
            "registered_count": registered_count,
            "checkin_percentage": checkin_pct,
            "attendee": attendee_data,
        }, status=status.HTTP_200_OK)


class EventAttendanceExportView(APIView):
    """
    Export event attendee check-in roster as a downloadable CSV.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, event_id):
        event = generics.get_object_or_404(Event.objects.select_related('club'), pk=event_id)
        user = request.user

        is_authorized = (
            user.is_staff or
            user.role == 'admin' or
            user == event.created_by or
            user == event.club.leader or
            event.club.memberships.filter(
                user=user,
                status='approved',
                role__in=['moderator', 'vice_president', 'president']
            ).exists()
        )
        if not is_authorized:
            return Response(
                {"detail": "Unauthorized to export attendance."},
                status=status.HTTP_403_FORBIDDEN
            )

        response = HttpResponse(content_type='text/csv')
        filename = f"attendance_event_{event.id}_{timezone.now().strftime('%Y%m%d')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow([
            'Student ID', 'Full Name', 'Email', 'Department',
            'Ticket Code', 'Ticket Status', 'Checked In', 'Check-In Timestamp', 'RSVP Timestamp'
        ])

        rsvps = (
            EventRSVP.objects
            .filter(event=event, status='attending')
            .select_related('user__profile')
            .order_by('created_at')
        )
        tickets = {t.attendee_id: t for t in EventTicket.objects.filter(event=event)}

        for rsvp in rsvps:
            u = rsvp.user
            profile = getattr(u, 'profile', None)
            t = tickets.get(u.id)
            writer.writerow([
                getattr(profile, 'student_id', '') or f"STU-{u.id}",
                u.full_name,
                u.email,
                getattr(profile, 'department', '') or 'General',
                t.ticket_code if t else 'N/A',
                t.status if t else 'N/A',
                'Yes' if t and t.is_checked_in else 'No',
                t.checked_in_at.strftime('%Y-%m-%d %H:%M:%S') if t and t.checked_in_at else 'N/A',
                rsvp.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            ])

        return response


# ==============================================================================
# Institutional Department Management Views
# ==============================================================================

class DepartmentListView(APIView):
    """
    List and create KPRIT academic departments.
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsInstitutionalAdmin()]

    def get(self, request):
        departments = Department.objects.all().order_by('code')
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if not has_permission(request.user, SYSTEM_SETTINGS) and not request.user.role in ('college_admin', 'super_admin', 'admin'):
            return Response({"error": "Permission denied: Requires institutional administrator privileges."}, status=status.HTTP_403_FORBIDDEN)
        serializer = DepartmentSerializer(data=request.data)
        if serializer.is_valid():
            dept = serializer.save()
            AuditLog.objects.create(
                actor=request.user,
                action="DEPARTMENT_CREATE",
                resource_type="Department",
                resource_id=str(dept.id),
                details={"code": dept.code, "name": dept.name},
                ip_address=request.META.get('REMOTE_ADDR', '')
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class DepartmentDetailView(APIView):
    """
    Retrieve, update, or deactivate individual KPRIT departments.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstitutionalAdmin]

    def get_object(self, pk):
        try:
            return Department.objects.get(pk=pk)
        except Department.DoesNotExist:
            return None

    def get(self, request, pk):
        dept = self.get_object(pk)
        if not dept:
            return Response({"error": "Department not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(DepartmentSerializer(dept).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        dept = self.get_object(pk)
        if not dept:
            return Response({"error": "Department not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = DepartmentSerializer(dept, data=request.data, partial=True)
        if serializer.is_valid():
            dept = serializer.save()
            AuditLog.objects.create(
                actor=request.user,
                action="DEPARTMENT_UPDATE",
                resource_type="Department",
                resource_id=str(dept.id),
                details={"updated_fields": list(request.data.keys())},
                ip_address=request.META.get('REMOTE_ADDR', '')
            )
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


# ==============================================================================
# Unified Institutional Approval Center Views
# ==============================================================================

class ApprovalRequestListView(APIView):
    """
    Unified approval queue for Events, Clubs, Announcements, Opportunities.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstitutionalAdmin]

    def get(self, request):
        qs = ApprovalRequest.objects.all().select_related('requested_by', 'reviewer')

        item_type = request.query_params.get('item_type')
        if item_type:
            qs = qs.filter(item_type=item_type)

        req_status = request.query_params.get('status', 'pending')
        if req_status != 'all':
            qs = qs.filter(status=req_status)

        serializer = ApprovalRequestSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ApprovalActionView(APIView):
    """
    Process an approval request: approve, reject, or request changes.
    Automatically synchronizes underlying resource status and logs audit event.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstitutionalAdmin]

    def post(self, request, pk):
        try:
            req = ApprovalRequest.objects.get(pk=pk)
        except ApprovalRequest.DoesNotExist:
            return Response({"error": "Approval request not found."}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action') # 'approve', 'reject', 'changes_requested'
        notes = request.data.get('notes', '')

        if action not in ('approve', 'reject', 'changes_requested'):
            return Response({"error": "Invalid action. Must be 'approve', 'reject', or 'changes_requested'."}, status=status.HTTP_400_BAD_REQUEST)

        # Update ApprovalRequest
        new_status = 'approved' if action == 'approve' else ('rejected' if action == 'reject' else 'changes_requested')
        req.status = new_status
        req.reviewer = request.user
        req.reviewer_notes = notes
        req.reviewed_at = timezone.now()
        req.save()

        # Synchronize target entity
        target_updated = False
        if req.item_type == 'event':
            try:
                ev = Event.objects.get(pk=req.item_id)
                ev.status = 'approved' if action == 'approve' else ('cancelled' if action == 'reject' else 'draft')
                ev.approved_by = request.user
                ev.approval_notes = notes
                ev.save()
                target_updated = True
            except Event.DoesNotExist:
                pass
        elif req.item_type == 'club':
            try:
                cl = Club.objects.get(pk=req.item_id)
                cl.status = 'approved' if action == 'approve' else 'rejected'
                cl.is_approved = (action == 'approve')
                cl.approved_by = request.user
                cl.approval_notes = notes
                cl.save()
                target_updated = True
            except Club.DoesNotExist:
                pass
        elif req.item_type == 'announcement':
            try:
                ann = Announcement.objects.get(pk=req.item_id)
                ann.status = 'approved' if action == 'approve' else 'draft'
                ann.approved_by = request.user
                ann.save()
                target_updated = True
            except Announcement.DoesNotExist:
                pass
        elif req.item_type == 'opportunity':
            try:
                opp = Opportunity.objects.get(pk=req.item_id)
                opp.status = 'approved' if action == 'approve' else 'draft'
                opp.approved_by = request.user
                opp.save()
                target_updated = True
            except Opportunity.DoesNotExist:
                pass

        # Audit log
        AuditLog.objects.create(
            actor=request.user,
            action=f"APPROVAL_{action.upper()}",
            resource_type=req.item_type.upper(),
            resource_id=str(req.item_id),
            details={"approval_id": req.id, "status": new_status, "notes": notes},
            ip_address=request.META.get('REMOTE_ADDR', '')
        )

        return Response({
            "message": f"Approval request marked as {new_status}.",
            "approval": ApprovalRequestSerializer(req).data,
            "target_updated": target_updated
        }, status=status.HTTP_200_OK)


# ==============================================================================
# Institutional Opportunity Hub Views
# ==============================================================================

class OpportunityListView(APIView):
    """
    List and create student opportunities (internships, hackathons, workshops, scholarships).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        is_staff_user = user.role in ('college_admin', 'super_admin', 'admin', 'tpo_admin', 'department_admin') or user.is_staff

        if is_staff_user:
            qs = Opportunity.objects.all()
        else:
            qs = Opportunity.objects.filter(status='published')

        opp_type = request.query_params.get('type')
        if opp_type:
            qs = qs.filter(opportunity_type=opp_type)

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(title__icontains=search) |
                models.Q(organization__icontains=search) |
                models.Q(description__icontains=search)
            )

        serializer = OpportunitySerializer(qs.order_by('deadline'), many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if not (has_permission(request.user, OPPORTUNITY_CREATE) or request.user.role in ('tpo_admin', 'college_admin', 'super_admin', 'admin')):
            return Response({"error": "Permission denied: Requires opportunity creator rights."}, status=status.HTTP_403_FORBIDDEN)

        serializer = OpportunitySerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            opp = serializer.save(created_by=request.user)

            # Create approval request if not superadmin
            if request.user.role not in ('super_admin', 'college_admin', 'admin'):
                opp.status = 'pending_approval'
                opp.save()
                ApprovalRequest.objects.create(
                    item_type='opportunity',
                    item_id=opp.id,
                    title=opp.title,
                    summary=f"Opportunity proposed by {request.user.full_name}: {opp.organization} ({opp.opportunity_type})",
                    requested_by=request.user,
                    status='pending'
                )

            AuditLog.objects.create(
                actor=request.user,
                action="OPPORTUNITY_CREATE",
                resource_type="Opportunity",
                resource_id=str(opp.id),
                details={"title": opp.title, "type": opp.opportunity_type},
                ip_address=request.META.get('REMOTE_ADDR', '')
            )
            return Response(OpportunitySerializer(opp, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class OpportunityDetailView(APIView):
    """
    Retrieve, update, or remove opportunity postings.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            opp = Opportunity.objects.get(pk=pk)
        except Opportunity.DoesNotExist:
            return Response({"error": "Opportunity not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(OpportunitySerializer(opp, context={'request': request}).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        if not (has_permission(request.user, OPPORTUNITY_MANAGE) or request.user.role in ('tpo_admin', 'college_admin', 'super_admin', 'admin')):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        try:
            opp = Opportunity.objects.get(pk=pk)
        except Opportunity.DoesNotExist:
            return Response({"error": "Opportunity not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = OpportunitySerializer(opp, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            opp = serializer.save()
            return Response(OpportunitySerializer(opp, context={'request': request}).data, status=status.HTTP_200_OK)
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class OpportunityApplyView(APIView):
    """
    Allows authenticated students to register / submit an application for an opportunity.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            opp = Opportunity.objects.get(pk=pk)
        except Opportunity.DoesNotExist:
            return Response({"error": "Opportunity not found."}, status=status.HTTP_404_NOT_FOUND)

        if opp.status != 'published':
            return Response({"error": "Applications are not currently open for this opportunity."}, status=status.HTTP_400_BAD_REQUEST)

        if OpportunityApplication.objects.filter(opportunity=opp, student=request.user).exists():
            return Response({"error": "You have already applied for this opportunity."}, status=status.HTTP_400_BAD_REQUEST)

        resume_url = request.data.get('resume_url', '')
        notes = request.data.get('notes', '')

        app = OpportunityApplication.objects.create(
            opportunity=opp,
            student=request.user,
            resume_url=resume_url or getattr(request.user.profile, 'resume_url', ''),
            notes=notes,
            status='applied'
        )

        return Response({
            "message": "Application submitted successfully.",
            "application": OpportunityApplicationSerializer(app).data
        }, status=status.HTTP_201_CREATED)


class OpportunityApplicantsView(APIView):
    """
    List student applicants for an opportunity.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstitutionalAdmin]

    def get(self, request, pk):
        try:
            opp = Opportunity.objects.get(pk=pk)
        except Opportunity.DoesNotExist:
            return Response({"error": "Opportunity not found."}, status=status.HTTP_404_NOT_FOUND)

        apps = opp.applications.all().select_related('student__profile')
        return Response(OpportunityApplicationSerializer(apps, many=True).data, status=status.HTTP_200_OK)


# ==============================================================================
# Training & Placement Office (TPO) Views
# ==============================================================================

class CompanyListView(APIView):
    """
    List and register recruiting corporate partners for KPRIT.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        companies = Company.objects.all().order_by('name')
        return Response(CompanySerializer(companies, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        if not (has_permission(request.user, PLACEMENT_CREATE) or request.user.role in ('tpo_admin', 'college_admin', 'super_admin', 'admin')):
            return Response({"error": "Permission denied: TPO privileges required."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CompanySerializer(data=request.data)
        if serializer.is_valid():
            company = serializer.save()
            AuditLog.objects.create(
                actor=request.user,
                action="COMPANY_CREATE",
                resource_type="Company",
                resource_id=str(company.id),
                details={"name": company.name, "tier": company.tier},
                ip_address=request.META.get('REMOTE_ADDR', '')
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class CompanyDetailView(APIView):
    """
    Retrieve or update individual recruiting company profile.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            comp = Company.objects.get(pk=pk)
        except Company.DoesNotExist:
            return Response({"error": "Company not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CompanySerializer(comp).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        if not (has_permission(request.user, PLACEMENT_EDIT) or request.user.role in ('tpo_admin', 'college_admin', 'super_admin', 'admin')):
            return Response({"error": "Permission denied: TPO privileges required."}, status=status.HTTP_403_FORBIDDEN)
        try:
            comp = Company.objects.get(pk=pk)
        except Company.DoesNotExist:
            return Response({"error": "Company not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CompanySerializer(comp, data=request.data, partial=True)
        if serializer.is_valid():
            comp = serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class PlacementDriveListView(APIView):
    """
    List and create recruitment drives with database-driven eligibility rules.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        is_tpo = user.role in ('tpo_admin', 'college_admin', 'super_admin', 'admin') or user.is_staff

        if is_tpo:
            qs = PlacementDrive.objects.all()
        else:
            qs = PlacementDrive.objects.filter(status='active')

        company_id = request.query_params.get('company')
        if company_id:
            qs = qs.filter(company_id=company_id)

        qs = qs.select_related('company').annotate(
            annotated_applications_count=models.Count('applications', distinct=True),
            annotated_selected_count=models.Count('applications', filter=models.Q(applications__status='selected'), distinct=True),
        ).order_by('-drive_date')

        drives = list(qs)
        extra_context = {'request': request}
        if user and user.is_authenticated:
            drive_ids = [d.id for d in drives]
            user_apps = PlacementApplication.objects.filter(student=user, drive_id__in=drive_ids)
            extra_context['user_applications'] = {app.drive_id: app for app in user_apps}

        serializer = PlacementDriveSerializer(drives, many=True, context=extra_context)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if not (has_permission(request.user, PLACEMENT_CREATE) or request.user.role in ('tpo_admin', 'college_admin', 'super_admin', 'admin')):
            return Response({"error": "Permission denied: TPO privileges required."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if 'company_id' in data and 'company' not in data:
            data['company'] = data['company_id']
        serializer = PlacementDriveSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            drive = serializer.save(created_by=request.user)
            AuditLog.objects.create(
                actor=request.user,
                action="PLACEMENT_DRIVE_CREATE",
                resource_type="PlacementDrive",
                resource_id=str(drive.id),
                details={"title": drive.title, "package_lpa": str(drive.package_lpa)},
                ip_address=request.META.get('REMOTE_ADDR', '')
            )
            return Response(PlacementDriveSerializer(drive, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class PlacementDriveDetailView(APIView):
    """
    Retrieve or update specific placement drive details.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            drive = PlacementDrive.objects.select_related('company').get(pk=pk)
        except PlacementDrive.DoesNotExist:
            return Response({"error": "Placement drive not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PlacementDriveSerializer(drive, context={'request': request}).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        if not (has_permission(request.user, PLACEMENT_EDIT) or request.user.role in ('tpo_admin', 'college_admin', 'super_admin', 'admin')):
            return Response({"error": "Permission denied: TPO privileges required."}, status=status.HTTP_403_FORBIDDEN)
        try:
            drive = PlacementDrive.objects.get(pk=pk)
        except PlacementDrive.DoesNotExist:
            return Response({"error": "Placement drive not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = PlacementDriveSerializer(drive, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            drive = serializer.save()
            return Response(PlacementDriveSerializer(drive, context={'request': request}).data, status=status.HTTP_200_OK)
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class PlacementDriveEligibilityCheckView(APIView):
    """
    Pre-flight verification: evaluates student eligibility against database-driven criteria.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            drive = PlacementDrive.objects.get(pk=pk)
        except PlacementDrive.DoesNotExist:
            return Response({"error": "Placement drive not found."}, status=status.HTTP_404_NOT_FOUND)

        eligible, reasons = drive.is_student_eligible(request.user)
        has_applied = drive.applications.filter(student=request.user).exists()

        return Response({
            "drive_id": drive.id,
            "drive_title": drive.title,
            "is_eligible": eligible,
            "reasons": reasons,
            "has_applied": has_applied,
        }, status=status.HTTP_200_OK)


class PlacementDriveApplyView(APIView):
    """
    Registers a student for a placement drive.
    Performs strict server-side eligibility check against database parameters.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            drive = PlacementDrive.objects.get(pk=pk)
        except PlacementDrive.DoesNotExist:
            return Response({"error": "Placement drive not found."}, status=status.HTTP_404_NOT_FOUND)

        # Enforce server-side eligibility check
        eligible, reasons = drive.is_student_eligible(request.user)
        if not eligible:
            return Response({
                "error": "You do not meet the institutional eligibility criteria for this recruitment drive.",
                "reasons": reasons
            }, status=status.HTTP_403_FORBIDDEN)

        # Check existing registration
        if PlacementApplication.objects.filter(drive=drive, student=request.user).exists():
            return Response({"error": "You are already registered for this placement drive."}, status=status.HTTP_400_BAD_REQUEST)

        profile = getattr(request.user, 'profile', None)
        resume_url = request.data.get('resume_url', '') or (profile.resume_url if profile else '')

        app = PlacementApplication.objects.create(
            drive=drive,
            student=request.user,
            cgpa_at_application=profile.cgpa if profile else None,
            resume_url=resume_url,
            status='applied'
        )

        AuditLog.objects.create(
            actor=request.user,
            action="PLACEMENT_APPLY",
            resource_type="PlacementApplication",
            resource_id=str(app.id),
            details={"drive_id": drive.id, "company": drive.company.name},
            ip_address=request.META.get('REMOTE_ADDR', '')
        )

        return Response({
            "message": "Successfully registered for placement drive.",
            "application": PlacementApplicationSerializer(app).data
        }, status=status.HTTP_201_CREATED)


class PlacementDriveApplicationsView(APIView):
    """
    Manage student applications for a placement drive.
    Allows TPO admins to filter, update applicant stages (shortlisted, selected, rejected).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        if not (has_permission(request.user, PLACEMENT_VIEW) or request.user.role in ('tpo_admin', 'college_admin', 'super_admin', 'admin')):
            return Response({"error": "Permission denied: TPO privileges required."}, status=status.HTTP_403_FORBIDDEN)

        try:
            drive = PlacementDrive.objects.get(pk=pk)
        except PlacementDrive.DoesNotExist:
            return Response({"error": "Placement drive not found."}, status=status.HTTP_404_NOT_FOUND)

        apps = drive.applications.all().select_related('student__profile', 'drive__company')
        stage = request.query_params.get('status')
        if stage:
            apps = apps.filter(status=stage)

        return Response(PlacementApplicationSerializer(apps, many=True).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        """
        Update candidate application status e.g. status='selected'
        """
        if not (has_permission(request.user, PLACEMENT_EDIT) or request.user.role in ('tpo_admin', 'college_admin', 'super_admin', 'admin')):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        app_id = request.data.get('application_id')
        new_status = request.data.get('status')

        if not app_id or not new_status:
            return Response({"error": "application_id and status are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            app = PlacementApplication.objects.get(pk=app_id, drive_id=pk)
        except PlacementApplication.DoesNotExist:
            return Response({"error": "Application not found for this drive."}, status=status.HTTP_404_NOT_FOUND)

        app.status = new_status
        app.status_notes = request.data.get('notes', app.status_notes)
        app.save()

        # If student is selected, update student profile is_placed flag
        if new_status == 'selected':
            profile = getattr(app.student, 'profile', None)
            if profile:
                profile.is_placed = True
                profile.save()

        return Response(PlacementApplicationSerializer(app).data, status=status.HTTP_200_OK)


class PlacementInterviewListView(APIView):
    """
    Schedule and view interview rounds for placement candidates.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not (has_permission(request.user, PLACEMENT_VIEW) or request.user.role in ('tpo_admin', 'college_admin', 'super_admin', 'admin')):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        drive_id = request.query_params.get('drive_id')
        qs = PlacementInterview.objects.all().select_related('application__student__profile', 'application__drive__company')
        if drive_id:
            qs = qs.filter(application__drive_id=drive_id)

        return Response(PlacementInterviewSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        if not (has_permission(request.user, PLACEMENT_EDIT) or request.user.role in ('tpo_admin', 'college_admin', 'super_admin', 'admin')):
            return Response({"error": "Permission denied: TPO privileges required."}, status=status.HTTP_403_FORBIDDEN)

        serializer = PlacementInterviewSerializer(data=request.data)
        if serializer.is_valid():
            interview = serializer.save()
            # Advance application status to interview_scheduled
            app = interview.application
            if app.status == 'applied':
                app.status = 'interview_scheduled'
                app.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class TPOStudentMasterView(APIView):
    """
    Master student directory for TPO coordinators: view CGPA, backlogs, branch, and placed status.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstitutionalAdmin]

    def get(self, request):
        if not (has_permission(request.user, PLACEMENT_VIEW) or request.user.role in ('tpo_admin', 'college_admin', 'super_admin', 'admin')):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        students = User.objects.filter(role='student').select_related('profile').order_by('profile__department', 'profile__student_id')

        dept = request.query_params.get('department')
        if dept:
            students = students.filter(profile__department__iexact=dept)

        placed = request.query_params.get('is_placed')
        if placed is not None and placed != '':
            students = students.filter(profile__is_placed=placed.lower() in ('true', '1'))

        grad_yr = request.query_params.get('graduation_year')
        if grad_yr:
            students = students.filter(profile__graduation_year=grad_yr)

        from users.serializers import UserSerializer
        return Response(UserSerializer(students, many=True).data, status=status.HTTP_200_OK)


class TPOReportsView(APIView):
    """
    Comprehensive placement report and metrics based strictly on database records.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstitutionalAdmin]

    def get(self, request):
        from users.models import StudentProfile

        total_registered_students = StudentProfile.objects.count()
        total_eligible_students = StudentProfile.objects.filter(backlogs=0).count()
        total_placed_students = StudentProfile.objects.filter(is_placed=True).count()
        placement_rate_pct = round((total_placed_students / max(total_registered_students, 1)) * 100, 1)

        drives_count = PlacementDrive.objects.count()
        companies_count = Company.objects.count()
        applications_count = PlacementApplication.objects.count()
        offers_count = PlacementApplication.objects.filter(status='selected').count()

        # Department breakdown
        dept_breakdown = []
        departments = Department.objects.filter(is_active=True)
        for dept in departments:
            d_students = StudentProfile.objects.filter(department__iexact=dept.code).count()
            d_placed = StudentProfile.objects.filter(department__iexact=dept.code, is_placed=True).count()
            dept_breakdown.append({
                "department": dept.code,
                "name": dept.name,
                "total_students": d_students,
                "placed_students": d_placed,
                "placement_rate": round((d_placed / max(d_students, 1)) * 100, 1)
            })

        return Response({
            "total_registered_students": total_registered_students,
            "total_eligible_students": total_eligible_students,
            "total_placed_students": total_placed_students,
            "placement_rate_pct": placement_rate_pct,
            "total_companies": companies_count,
            "total_drives": drives_count,
            "total_applications": applications_count,
            "total_offers": offers_count,
            "department_breakdown": dept_breakdown,
        }, status=status.HTTP_200_OK)


# ==============================================================================
# Institutional Analytics & Audit Views
# ==============================================================================

class AdminAnalyticsView(APIView):
    """
    Institutional analytics computed live from active database records.
    Zero fabrication: returns 0 or empty states when records do not exist.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstitutionalAdmin]

    def get(self, request):
        from users.models import StudentProfile, FacultyProfile

        total_students = User.objects.filter(role='student').count()
        total_faculty = User.objects.filter(role__in=['faculty', 'department_admin']).count()
        total_clubs = Club.objects.filter(is_approved=True).count()
        pending_clubs = Club.objects.filter(status='pending_approval').count()

        total_events = Event.objects.count()
        published_events = Event.objects.filter(status__in=['published', 'registration_open']).count()
        total_rsvps = EventRSVP.objects.filter(status='attending').count()
        checked_in_attendance = EventTicket.objects.filter(is_checked_in=True).count()

        total_drives = PlacementDrive.objects.count()
        active_drives = PlacementDrive.objects.filter(status='active').count()
        total_companies = Company.objects.filter(is_active=True).count()
        placed_students = StudentProfile.objects.filter(is_placed=True).count()

        pending_approvals = ApprovalRequest.objects.filter(status='pending').count()
        total_opportunities = Opportunity.objects.filter(status='published').count()

        # Category distribution of events
        cat_stats = []
        for cat, _ in Event.CATEGORY_CHOICES:
            cnt = Event.objects.filter(category=cat).count()
            cat_stats.append({"category": cat, "count": cnt})

        # Department student distribution
        dept_stats = []
        for d in Department.objects.filter(is_active=True):
            cnt = StudentProfile.objects.filter(department__iexact=d.code).count()
            dept_stats.append({"department": d.code, "count": cnt})

        return Response({
            "metrics": {
                "total_students": total_students,
                "total_faculty": total_faculty,
                "total_clubs": total_clubs,
                "pending_clubs": pending_clubs,
                "total_events": total_events,
                "published_events": published_events,
                "total_rsvps": total_rsvps,
                "checked_in_attendance": checked_in_attendance,
                "attendance_rate_pct": round((checked_in_attendance / max(total_rsvps, 1)) * 100, 1),
                "total_companies": total_companies,
                "total_drives": total_drives,
                "active_drives": active_drives,
                "placed_students": placed_students,
                "pending_approvals": pending_approvals,
                "total_opportunities": total_opportunities,
            },
            "event_category_distribution": cat_stats,
            "department_distribution": dept_stats,
        }, status=status.HTTP_200_OK)


class AuditLogListView(APIView):
    """
    Searchable and filterable administrative audit trail.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstitutionalAdmin]

    def get(self, request):
        if not (has_permission(request.user, AUDIT_VIEW) or request.user.role in ('super_admin', 'college_admin', 'admin')):
            return Response({"error": "Permission denied: AUDIT_VIEW required."}, status=status.HTTP_403_FORBIDDEN)

        qs = AuditLog.objects.all().select_related('actor').order_by('-created_at')

        action = request.query_params.get('action')
        if action:
            qs = qs.filter(action__icontains=action)

        res_type = request.query_params.get('resource_type')
        if res_type:
            qs = qs.filter(resource_type__iexact=res_type)

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(action__icontains=search) |
                models.Q(resource_type__icontains=search) |
                models.Q(resource_id__icontains=search) |
                models.Q(actor__email__icontains=search) |
                models.Q(actor__full_name__icontains=search)
            )

        paginator = PageNumberPagination()
        paginator.page_size = 25
        page = paginator.paginate_queryset(qs, request)
        serializer = AuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class SystemSettingListView(APIView):
    """
    Institutional configuration settings.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstitutionalAdmin]

    def get(self, request):
        settings = SystemSetting.objects.all().order_by('key')
        return Response(SystemSettingSerializer(settings, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        if not (has_permission(request.user, SYSTEM_SETTINGS) or request.user.role in ('super_admin', 'admin')):
            return Response({"error": "Permission denied: SYSTEM_SETTINGS required."}, status=status.HTTP_403_FORBIDDEN)

        key = request.data.get('key')
        value = request.data.get('value')
        description = request.data.get('description', '')

        if not key:
            return Response({"error": "Key is required."}, status=status.HTTP_400_BAD_REQUEST)

        setting, _ = SystemSetting.objects.update_or_create(
            key=key,
            defaults={
                "value": value,
                "description": description,
                "updated_by": request.user,
            }
        )

        AuditLog.objects.create(
            actor=request.user,
            action="SYSTEM_SETTING_UPDATE",
            resource_type="SystemSetting",
            resource_id=key,
            details={"value": value},
            ip_address=request.META.get('REMOTE_ADDR', '')
        )

        return Response(SystemSettingSerializer(setting).data, status=status.HTTP_200_OK)


class AdminBroadcastNotificationView(APIView):
    """
    Enables administrators to broadcast targeted campus notifications
    to all students, department, graduation year, section, faculty, or TPO applicants.
    """
    permission_classes = [permissions.IsAuthenticated, IsInstitutionalAdmin]

    def post(self, request):
        title = request.data.get('title')
        message = request.data.get('message')
        target_group = request.data.get('target_group', 'all_students') # 'all_students', 'department', 'year', 'section', 'faculty', 'tpo_applicants'
        target_val = request.data.get('target_value', '')

        if not title or not message:
            return Response({"error": "Title and message are required."}, status=status.HTTP_400_BAD_REQUEST)

        recipients_qs = User.objects.none()

        if target_group == 'all_students':
            recipients_qs = User.objects.filter(role='student', is_active=True)
        elif target_group == 'department':
            recipients_qs = User.objects.filter(role='student', profile__department__iexact=target_val, is_active=True)
        elif target_group == 'year':
            try:
                recipients_qs = User.objects.filter(role='student', profile__graduation_year=int(target_val), is_active=True)
            except ValueError:
                recipients_qs = User.objects.filter(role='student', is_active=True)
        elif target_group == 'faculty':
            recipients_qs = User.objects.filter(role__in=['faculty', 'department_admin'], is_active=True)
        elif target_group == 'tpo_applicants':
            drive_id = target_val
            if drive_id:
                recipients_qs = User.objects.filter(placement_applications__drive_id=drive_id, is_active=True)
            else:
                recipients_qs = User.objects.filter(placement_applications__isnull=False, is_active=True).distinct()
        else:
            recipients_qs = User.objects.filter(is_active=True)

        count = 0
        batch = []
        for user in recipients_qs:
            batch.append(
                Notification(
                    recipient=user,
                    notification_type='system',
                    title=f"[KPRIT Notice] {title}",
                    message=message,
                    link_url=request.data.get('link_url', ''),
                )
            )
            count += 1
            if len(batch) >= 500:
                Notification.objects.bulk_create(batch)
                batch = []

        if batch:
            Notification.objects.bulk_create(batch)

        AuditLog.objects.create(
            actor=request.user,
            action="BROADCAST_NOTIFICATION",
            resource_type="Notification",
            resource_id=target_group,
            details={"title": title, "recipients_count": count},
            ip_address=request.META.get('REMOTE_ADDR', '')
        )

        return Response({
            "message": f"Targeted notice broadcast to {count} recipients.",
            "recipients_count": count
        }, status=status.HTTP_201_CREATED)



