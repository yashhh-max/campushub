from rest_framework import serializers
from django.utils.text import slugify
from .models import (
    Club, Event, EventRSVP, Announcement, ClubMembership, ClubPost,
    Notification, NotificationPreference, ClubMessage, EventQuestion,
    EventQuestionUpvote, EventAnswer, EventTicket
)




class ClubSummarySerializer(serializers.ModelSerializer):
    leader_name = serializers.CharField(source='leader.full_name', read_only=True)

    class Meta:
        model = Club
        fields = [
            'id',
            'name',
            'slug',
            'category',
            'accent_color',
            'leader_name',
        ]


class ClubSerializer(serializers.ModelSerializer):
    leader_name = serializers.CharField(source='leader.full_name', read_only=True)
    leader_email = serializers.EmailField(source='leader.email', read_only=True)
    events_count = serializers.IntegerField(source='events.count', read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    pending_applications_count = serializers.SerializerMethodField()
    user_membership_status = serializers.SerializerMethodField()
    user_membership_role = serializers.SerializerMethodField()
    is_leader = serializers.SerializerMethodField()

    class Meta:
        model = Club
        fields = [
            'id',
            'name',
            'slug',
            'category',
            'description',
            'leader_name',
            'leader_email',
            'meeting_schedule',
            'location',
            'accent_color',
            'banner_gradient',
            'membership_requires_approval',
            'tags',
            'is_approved',
            'member_count',
            'pending_applications_count',
            'user_membership_status',
            'user_membership_role',
            'is_leader',
            'events_count',
            'created_at',
            'updated_at',
        ]

    def get_pending_applications_count(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return 0
        user = request.user
        if (
            user.role == 'admin' or
            user.is_staff or
            obj.leader == user or
            obj.memberships.filter(user=user, role__in=['president', 'vice_president'], status='approved').exists()
        ):
            return obj.pending_applications_count
        return 0

    def get_user_membership_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return None
        membership = obj.memberships.filter(user=request.user).first()
        return membership.status if membership else None

    def get_user_membership_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return None
        if obj.leader == request.user:
            return 'president'
        membership = obj.memberships.filter(user=request.user, status='approved').first()
        return membership.role if membership else None

    def get_is_leader(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        user = request.user
        return bool(
            user.role == 'admin' or
            user.is_staff or
            obj.leader == user or
            obj.memberships.filter(user=user, role__in=['president', 'vice_president'], status='approved').exists()
        )


class ClubWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Club
        fields = [
            'id',
            'name',
            'slug',
            'category',
            'description',
            'meeting_schedule',
            'location',
            'accent_color',
            'banner_gradient',
            'membership_requires_approval',
            'tags',
            'is_approved',
        ]
        extra_kwargs = {
            'slug': {'required': False},
        }

    def validate_name(self, value):
        cleaned = value.strip()
        instance = getattr(self, 'instance', None)
        qs = Club.objects.filter(name__iexact=cleaned)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A club with this name already exists.")
        return cleaned

    def create(self, validated_data):
        if not validated_data.get('slug'):
            base_slug = slugify(validated_data['name'])
            slug = base_slug
            counter = 1
            while Club.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data['slug'] = slug
        return super().create(validated_data)


class ClubMembershipSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    department = serializers.CharField(source='user.profile.department', read_only=True, default='')
    student_id = serializers.CharField(source='user.profile.student_id', read_only=True, default='')
    club_name = serializers.CharField(source='club.name', read_only=True)
    club_slug = serializers.CharField(source='club.slug', read_only=True)

    class Meta:
        model = ClubMembership
        fields = [
            'id',
            'club',
            'club_name',
            'club_slug',
            'user_id',
            'full_name',
            'email',
            'department',
            'student_id',
            'role',
            'status',
            'title',
            'joined_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'club', 'user_id', 'joined_at', 'updated_at']


class MyClubMembershipSerializer(serializers.ModelSerializer):
    club = ClubSerializer(read_only=True)
    membership_id = serializers.IntegerField(source='id', read_only=True)

    class Meta:
        model = ClubMembership
        fields = [
            'membership_id',
            'role',
            'status',
            'title',
            'joined_at',
            'club',
        ]


class ClubPostSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)
    author_role = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = ClubPost
        fields = [
            'id',
            'club',
            'author',
            'author_name',
            'author_email',
            'author_role',
            'title',
            'content',
            'post_type',
            'is_pinned',
            'is_members_only',
            'can_edit',
            'can_delete',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'club', 'author', 'created_at', 'updated_at']

    def get_author_role(self, obj):
        if obj.club.leader == obj.author:
            return 'President'
        membership = obj.club.memberships.filter(user=obj.author, status='approved').first()
        if membership:
            return membership.title or membership.get_role_display()
        if obj.author.role == 'admin':
            return 'Campus Admin'
        return 'Member'

    def get_can_edit(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        user = request.user
        return bool(
            user == obj.author or
            user.role == 'admin' or
            user.is_staff or
            obj.club.leader == user or
            obj.club.memberships.filter(user=user, role__in=['president', 'vice_president', 'moderator'], status='approved').exists()
        )

    def get_can_delete(self, obj):
        return self.get_can_edit(obj)


class ClubPostWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubPost
        fields = [
            'id',
            'title',
            'content',
            'post_type',
            'is_pinned',
            'is_members_only',
        ]

    def validate(self, attrs):
        request = self.context.get('request')
        club = self.context.get('club')
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")

        user = request.user
        is_leader = (
            user.role == 'admin' or
            user.is_staff or
            (club and club.leader == user) or
            (club and club.memberships.filter(user=user, role__in=['president', 'vice_president', 'moderator'], status='approved').exists())
        )
        post_type = attrs.get('post_type', 'discussion')

        # Announcements & Updates can only be created by leadership
        if post_type in ('announcement', 'update') and not is_leader:
            raise serializers.ValidationError({
                "post_type": "Only club leaders and moderators can publish announcements or updates."
            })

        # Only leadership can pin posts
        if attrs.get('is_pinned', False) and not is_leader:
            attrs['is_pinned'] = False

        return attrs


class EventSerializer(serializers.ModelSerializer):
    club = ClubSummarySerializer(read_only=True)
    club_id = serializers.PrimaryKeyRelatedField(
        queryset=Club.objects.filter(is_approved=True),
        source='club',
        write_only=True,
        required=True
    )
    club_name = serializers.CharField(source='club.name', read_only=True)
    rsvp_count = serializers.IntegerField(read_only=True)
    attendee_count = serializers.IntegerField(source='rsvp_count', read_only=True)
    waitlist_count = serializers.IntegerField(read_only=True)
    available_seats = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    has_started = serializers.BooleanField(read_only=True)
    has_ended = serializers.BooleanField(read_only=True)
    organizer = serializers.SerializerMethodField()
    user_rsvp_status = serializers.SerializerMethodField()
    user_waitlist_position = serializers.SerializerMethodField()
    is_organizer = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id',
            'title',
            'category',
            'description',
            'location',
            'start_time',
            'end_time',
            'capacity',
            'rsvp_count',
            'attendee_count',
            'waitlist_count',
            'available_seats',
            'is_full',
            'has_started',
            'has_ended',
            'featured',
            'image_gradient',
            'tags',
            'is_published',
            'club',
            'club_id',
            'club_name',
            'organizer',
            'user_rsvp_status',
            'user_waitlist_position',
            'is_organizer',
            'created_at',
            'updated_at',
        ]

    def get_organizer(self, obj):
        if not obj.created_by:
            return None
        return {
            "id": obj.created_by.id,
            "full_name": obj.created_by.full_name or obj.created_by.email.split('@')[0],
            "email": obj.created_by.email,
        }

    def get_user_rsvp_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return None

        # Check user's active RSVP (attending or waitlist)
        rsvp = obj.rsvps.filter(user=request.user).first()
        return rsvp.status if rsvp else None

    def get_user_waitlist_position(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return None
        rsvp = obj.rsvps.filter(user=request.user, status='waitlist').first()
        return rsvp.waitlist_position if rsvp else None

    def get_is_organizer(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        user = request.user
        return bool(
            user == obj.created_by or
            (obj.club and user == obj.club.leader) or
            user.role == 'admin' or
            user.is_staff
        )


class EventWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            'id',
            'club',
            'title',
            'category',
            'description',
            'location',
            'start_time',
            'end_time',
            'capacity',
            'featured',
            'image_gradient',
            'tags',
            'is_published',
        ]

    def validate_capacity(self, value):
        if value < 1:
            raise serializers.ValidationError("Capacity must be at least 1 seat.")
        return value

    def validate(self, attrs):
        start_time = attrs.get('start_time') or (self.instance and self.instance.start_time)
        end_time = attrs.get('end_time') or (self.instance and self.instance.end_time)

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({
                "end_time": "Event end time must be strictly after the start time."
            })

        # When creating or re-assigning club, verify user authorization
        request = self.context.get('request')
        if request and request.user:
            club = attrs.get('club') or (self.instance and self.instance.club)
            if club and not (
                request.user.role == 'admin' or
                request.user.is_staff or
                club.leader == request.user or
                (self.instance and self.instance.created_by == request.user)
            ):
                raise serializers.ValidationError({
                    "club": "You are not authorized to create or edit events for this club."
                })

        return attrs


class EventAttendeeSerializer(serializers.ModelSerializer):
    student_id = serializers.CharField(source='user.profile.student_id', read_only=True, default='')
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    department = serializers.CharField(source='user.profile.department', read_only=True, default='')
    rsvp_time = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = EventRSVP
        fields = [
            'id',
            'student_id',
            'full_name',
            'email',
            'department',
            'status',
            'rsvp_time',
        ]


class MyEventRSVPSerializer(serializers.ModelSerializer):
    event = EventSerializer(read_only=True)
    rsvp_id = serializers.IntegerField(source='id', read_only=True)
    rsvp_time = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = EventRSVP
        fields = [
            'rsvp_id',
            'status',
            'rsvp_time',
            'event',
        ]


class EventRSVPSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)

    class Meta:
        model = EventRSVP
        fields = [
            'id',
            'event',
            'event_title',
            'user',
            'user_email',
            'status',
            'created_at',
        ]
        read_only_fields = ['user', 'created_at']


class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)
    computed_status = serializers.CharField(read_only=True)

    class Meta:
        model = Announcement
        fields = [
            'id',
            'title',
            'content',
            'priority',
            'category',
            'author',
            'author_name',
            'author_email',
            'author_title',
            'target_audience',
            'target_department',
            'target_graduation_year',
            'is_published',
            'scheduled_at',
            'expires_at',
            'published_at',
            'created_at',
            'updated_at',
            'computed_status',
        ]
        read_only_fields = ['author', 'created_at', 'updated_at', 'computed_status']


class AnnouncementWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = [
            'title',
            'content',
            'priority',
            'category',
            'author_title',
            'target_audience',
            'target_department',
            'target_graduation_year',
            'is_published',
            'scheduled_at',
            'expires_at',
        ]

    def validate(self, attrs):
        scheduled_at = attrs.get('scheduled_at')
        expires_at = attrs.get('expires_at')

        # Check existing instance if partial update
        if self.instance:
            if scheduled_at is None:
                scheduled_at = self.instance.scheduled_at
            if expires_at is None:
                expires_at = self.instance.expires_at

        if scheduled_at and expires_at and expires_at <= scheduled_at:
            raise serializers.ValidationError({
                "expires_at": "Expiration date/time must be after the scheduled release date/time."
            })

        target_audience = attrs.get('target_audience') or (self.instance.target_audience if self.instance else 'everyone')
        target_department = attrs.get('target_department') or (self.instance.target_department if self.instance else '')
        target_graduation_year = attrs.get('target_graduation_year') or (self.instance.target_graduation_year if self.instance else None)

        if target_audience == 'department' and not target_department:
            raise serializers.ValidationError({
                "target_department": "Target department is required when targeting a specific department."
            })
        if target_audience == 'graduation_year' and not target_graduation_year:
            raise serializers.ValidationError({
                "target_graduation_year": "Target graduation year is required when targeting a graduation class."
            })
        if target_audience == 'both':
            if not target_department:
                raise serializers.ValidationError({
                    "target_department": "Target department is required when targeting both."
                })
            if not target_graduation_year:
                raise serializers.ValidationError({
                    "target_graduation_year": "Target graduation year is required when targeting both."
                })

        return attrs


class NotificationSerializer(serializers.ModelSerializer):
    recipient_email = serializers.EmailField(source='recipient.email', read_only=True)
    related_event_title = serializers.CharField(source='related_event.title', read_only=True)
    related_club_name = serializers.CharField(source='related_club.name', read_only=True)
    related_announcement_title = serializers.CharField(source='related_announcement.title', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'recipient_email',
            'notification_type',
            'title',
            'message',
            'related_event',
            'related_event_title',
            'related_club',
            'related_club_name',
            'related_announcement',
            'related_announcement_title',
            'link_url',
            'is_read',
            'created_at',
        ]
        read_only_fields = ['recipient', 'created_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'announcements',
            'event_reminders',
            'rsvp_updates',
            'waitlist_promotions',
            'club_activity',
            'email_notifications',
            'updated_at',
        ]
        read_only_fields = ['updated_at']


class ClubMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    sender_role = serializers.SerializerMethodField()
    content = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = ClubMessage
        fields = [
            'id',
            'club',
            'sender_id',
            'sender_name',
            'sender_email',
            'sender_role',
            'content',
            'is_deleted',
            'can_delete',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'club', 'sender_id', 'created_at', 'updated_at']

    def get_content(self, obj):
        if obj.is_deleted:
            return "[This message was deleted]"
        return obj.content

    def get_sender_role(self, obj):
        if obj.club.leader == obj.sender:
            return 'President'
        membership = obj.club.memberships.filter(user=obj.sender, status='approved').first()
        if membership:
            return membership.title or membership.get_role_display()
        if getattr(obj.sender, 'role', '') == 'admin':
            return 'Admin'
        return 'Member'

    def get_can_delete(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        user = request.user
        if user == obj.sender or user.is_staff or user.role == 'admin':
            return True
        if obj.club.leader == user:
            return True
        return obj.club.memberships.filter(
            user=user,
            status='approved',
            role__in=['moderator', 'vice_president', 'president']
        ).exists()


class EventAnswerSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)
    author_role = serializers.SerializerMethodField()

    class Meta:
        model = EventAnswer
        fields = [
            'id',
            'question',
            'author',
            'author_name',
            'author_email',
            'author_role',
            'content',
            'is_official',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def get_author_role(self, obj):
        event = obj.question.event
        if obj.author == event.created_by or obj.author == event.club.leader:
            return 'Organizer'
        if obj.author.role == 'admin' or obj.author.is_staff:
            return 'Admin'
        if event.club.memberships.filter(
            user=obj.author,
            status='approved',
            role__in=['moderator', 'vice_president', 'president']
        ).exists():
            return 'Club Officer'
        return 'Student'


class EventQuestionSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)
    upvotes_count = serializers.IntegerField(read_only=True)
    has_upvoted = serializers.SerializerMethodField()
    answers = EventAnswerSerializer(many=True, read_only=True)
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = EventQuestion
        fields = [
            'id',
            'event',
            'author',
            'author_name',
            'author_email',
            'content',
            'is_pinned',
            'upvotes_count',
            'has_upvoted',
            'answers',
            'can_delete',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def get_has_upvoted(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return obj.upvotes.filter(user=request.user).exists()

    def get_can_delete(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        user = request.user
        if user == obj.author or user.is_staff or user.role == 'admin':
            return True
        event = obj.event
        if user == event.created_by or user == event.club.leader:
            return True
        return event.club.memberships.filter(
            user=user,
            status='approved',
            role__in=['moderator', 'vice_president', 'president']
        ).exists()


class EventTicketSerializer(serializers.ModelSerializer):
    event_id = serializers.IntegerField(source='event.id', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)
    event_location = serializers.CharField(source='event.location', read_only=True)
    event_start_time = serializers.DateTimeField(source='event.start_time', read_only=True)
    event_end_time = serializers.DateTimeField(source='event.end_time', read_only=True)
    club_name = serializers.CharField(source='event.club.name', read_only=True)
    attendee_name = serializers.CharField(source='attendee.full_name', read_only=True)
    attendee_email = serializers.EmailField(source='attendee.email', read_only=True)
    qr_code_svg = serializers.ReadOnlyField()

    class Meta:
        model = EventTicket
        fields = [
            'id',
            'ticket_code',
            'qr_payload',
            'status',
            'is_checked_in',
            'issued_at',
            'checked_in_at',
            'event_id',
            'event_title',
            'event_location',
            'event_start_time',
            'event_end_time',
            'club_name',
            'attendee_name',
            'attendee_email',
            'qr_code_svg',
        ]
        read_only_fields = [
            'id',
            'ticket_code',
            'qr_payload',
            'status',
            'is_checked_in',
            'issued_at',
            'checked_in_at',
        ]

