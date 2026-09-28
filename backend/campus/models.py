from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone


class Department(models.Model):
    """
    Academic departments at KPRIT (e.g. CSE, ECE, CSM, CSD, EEE, MECH, CIVIL, MBA).
    """
    name = models.CharField(max_length=150, unique=True)
    code = models.CharField(max_length=20, unique=True, db_index=True)
    description = models.TextField(blank=True)
    hod_name = models.CharField(max_length=150, blank=True)
    contact_email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"


class Club(models.Model):
    """
    Student organization or campus society.
    """
    CATEGORY_CHOICES = (
        ('Technology', 'Technology'),
        ('STEM', 'STEM'),
        ('Leadership', 'Leadership'),
        ('Creative Arts', 'Creative Arts'),
        ('Volunteering', 'Volunteering'),
        ('Culture', 'Culture'),
    )

    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=160, unique=True, db_index=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, db_index=True)
    description = models.TextField()
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='led_clubs'
    )
    faculty_coordinator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='coordinated_clubs'
    )
    status = models.CharField(
        max_length=30,
        choices=(
            ('pending_approval', 'Pending Approval'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
        ),
        default='approved',
        db_index=True
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_clubs'
    )
    approval_notes = models.TextField(blank=True)
    meeting_schedule = models.CharField(max_length=150, blank=True)
    location = models.CharField(max_length=150, blank=True)
    accent_color = models.CharField(
        max_length=100,
        default='bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
    )
    banner_gradient = models.CharField(
        max_length=100,
        default='from-indigo-600 to-blue-700'
    )
    membership_requires_approval = models.BooleanField(
        default=True,
        help_text="Whether joining this club requires leader approval."
    )
    tags = models.JSONField(default=list, blank=True)
    is_approved = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['category', 'is_approved']),
            models.Index(fields=['status', 'category']),
        ]

    def __str__(self):
        return self.name

    @property
    def member_count(self):
        if hasattr(self, 'annotated_member_count'):
            return self.annotated_member_count
        return self.memberships.filter(status='approved').count()

    @property
    def pending_applications_count(self):
        if hasattr(self, 'annotated_pending_count'):
            return self.annotated_pending_count
        return self.memberships.filter(status='pending').count()


class Event(models.Model):
    """
    Collegiate events hosted by student clubs or campus departments.
    """
    CATEGORY_CHOICES = (
        ('Tech', 'Tech'),
        ('Career', 'Career'),
        ('Arts', 'Arts'),
        ('Social', 'Social'),
        ('Academic', 'Academic'),
        ('Sports', 'Sports'),
    )

    club = models.ForeignKey(
        Club,
        on_delete=models.CASCADE,
        related_name='events'
    )
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, db_index=True)
    description = models.TextField()
    location = models.CharField(max_length=200)
    start_time = models.DateTimeField(db_index=True)
    end_time = models.DateTimeField()
    capacity = models.PositiveIntegerField(
        default=100,
        validators=[MinValueValidator(1, message="Capacity must be at least 1 seat.")]
    )
    featured = models.BooleanField(default=False)
    image_gradient = models.CharField(
        max_length=100,
        default='from-indigo-600 to-blue-700'
    )
    tags = models.JSONField(default=list, blank=True)
    EVENT_STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('pending_approval', 'Pending Approval'),
        ('approved', 'Approved'),
        ('published', 'Published'),
        ('registration_open', 'Registration Open'),
        ('registration_closed', 'Registration Closed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    status = models.CharField(
        max_length=30,
        choices=EVENT_STATUS_CHOICES,
        default='published',
        db_index=True,
        help_text="Institutional lifecycle status"
    )
    is_published = models.BooleanField(default=True, db_index=True)
    venue = models.CharField(max_length=200, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_events'
    )
    approval_notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_events'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_time']
        indexes = [
            models.Index(fields=['start_time', 'is_published']),
            models.Index(fields=['category', 'is_published']),
            models.Index(fields=['status', 'start_time']),
            models.Index(fields=['club', 'start_time']),
        ]

    def clean(self):
        super().clean()
        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                raise ValidationError({"end_time": "Event end time must be after the start time."})

    def __str__(self):
        return f"{self.title} ({self.club.name})"

    @property
    def rsvp_count(self):
        if hasattr(self, 'annotated_rsvp_count'):
            return self.annotated_rsvp_count
        return self.rsvps.filter(status='attending').count()

    @property
    def available_seats(self):
        return max(0, self.capacity - self.rsvp_count)

    @property
    def is_full(self):
        return self.rsvp_count >= self.capacity

    @property
    def has_started(self):
        return self.start_time <= timezone.now()

    @property
    def has_ended(self):
        return self.end_time <= timezone.now()

    @property
    def waitlist_count(self):
        if hasattr(self, 'annotated_waitlist_count'):
            return self.annotated_waitlist_count
        return self.rsvps.filter(status='waitlist').count()


class EventRSVP(models.Model):
    """
    Tracks student registrations for events with waitlist capabilities.
    Database unique constraint guarantees no student can RSVP twice to the same event.
    """
    STATUS_CHOICES = (
        ('attending', 'Attending'),
        ('waitlist', 'Waitlist'),
        ('cancelled', 'Cancelled'),
    )

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='rsvps'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='event_rsvps'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='attending',
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['event', 'user'],
                name='unique_user_event_rsvp'
            )
        ]
        indexes = [
            models.Index(fields=['event', 'status', 'created_at']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.event.title} ({self.status})"

    @property
    def waitlist_position(self):
        if self.status != 'waitlist':
            return None
        earlier_count = EventRSVP.objects.filter(
            event=self.event,
            status='waitlist',
            created_at__lt=self.created_at
        ).count()
        return earlier_count + 1


class ClubMembership(models.Model):
    """
    Student membership and leadership hierarchy in campus organizations.
    Enforces uniqueness so each student has at most one membership record per club.
    """
    ROLE_CHOICES = (
        ('member', 'Member'),
        ('moderator', 'Moderator'),
        ('vice_president', 'Vice President'),
        ('president', 'President'),
    )
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    club = models.ForeignKey(
        Club,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='club_memberships'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='member'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    title = models.CharField(max_length=100, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-joined_at']
        constraints = [
            models.UniqueConstraint(
                fields=['club', 'user'],
                name='unique_user_club_membership'
            )
        ]
        indexes = [
            models.Index(fields=['club', 'status']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.club.name} ({self.role} / {self.status})"


class ClubPost(models.Model):
    """
    Community updates, announcements, and discussion posts inside a club.
    """
    POST_TYPE_CHOICES = (
        ('announcement', 'Announcement'),
        ('update', 'Update'),
        ('discussion', 'Discussion'),
    )

    club = models.ForeignKey(
        Club,
        on_delete=models.CASCADE,
        related_name='posts'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='club_posts'
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    post_type = models.CharField(
        max_length=20,
        choices=POST_TYPE_CHOICES,
        default='discussion',
        db_index=True
    )
    is_pinned = models.BooleanField(default=False)
    is_members_only = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']
        indexes = [
            models.Index(fields=['club', '-is_pinned', '-created_at']),
        ]

    def __str__(self):
        return f"[{self.post_type.upper()}] {self.title} ({self.club.name})"


class Announcement(models.Model):
    """
    Official campus notifications published by administration or leaders.
    Supports priority levels, audience targeting (department/year), and scheduled release.
    """
    PRIORITY_CHOICES = (
        ('urgent', 'Urgent'),
        ('official', 'Official'),
        ('general', 'General'),
    )

    TARGET_AUDIENCE_CHOICES = (
        ('everyone', 'Everyone'),
        ('department', 'Specific Department'),
        ('graduation_year', 'Specific Graduation Year'),
        ('both', 'Department & Graduation Year'),
    )

    title = models.CharField(max_length=200)
    content = models.TextField()
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='general',
        db_index=True
    )
    category = models.CharField(max_length=50, default='General')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='announcements'
    )
    author_title = models.CharField(max_length=100, default='Campus Administration')
    
    # Audience Targeting
    target_audience = models.CharField(
        max_length=20,
        choices=TARGET_AUDIENCE_CHOICES,
        default='everyone',
        db_index=True
    )
    target_department = models.CharField(max_length=100, blank=True)
    target_graduation_year = models.PositiveIntegerField(null=True, blank=True)
    target_section = models.CharField(max_length=10, blank=True)
    target_role = models.CharField(max_length=30, blank=True)

    # Institutional Lifecycle & Approval
    status = models.CharField(
        max_length=30,
        choices=(
            ('draft', 'Draft'),
            ('pending_approval', 'Pending Approval'),
            ('approved', 'Approved'),
            ('published', 'Published'),
            ('expired', 'Expired'),
            ('archived', 'Archived'),
        ),
        default='published',
        db_index=True
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_announcements'
    )

    # Publishing & Scheduling
    is_published = models.BooleanField(default=True, db_index=True)
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    published_at = models.DateTimeField(default=timezone.now, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-published_at']
        indexes = [
            models.Index(fields=['priority', 'is_published']),
            models.Index(fields=['target_audience', 'is_published']),
            models.Index(fields=['scheduled_at', 'expires_at']),
        ]

    def __str__(self):
        return f"[{self.priority.upper()}] {self.title}"

    @property
    def computed_status(self):
        now = timezone.now()
        if not self.is_published:
            return 'draft'
        if self.scheduled_at and self.scheduled_at > now:
            return 'scheduled'
        if self.expires_at and self.expires_at <= now:
            return 'expired'
        return 'published'

    @property
    def is_currently_active(self):
        now = timezone.now()
        if not self.is_published:
            return False
        if self.scheduled_at and self.scheduled_at > now:
            return False
        if self.expires_at and self.expires_at <= now:
            return False
        return True

    def is_targeted_to_user(self, user):
        if self.target_audience == 'everyone':
            return True
        if not user or not user.is_authenticated:
            return False
        profile = getattr(user, 'profile', None)
        if not profile:
            return False
        dept_match = bool(
            self.target_department and
            profile.department and
            profile.department.strip().lower() == self.target_department.strip().lower()
        )
        grad_match = bool(
            self.target_graduation_year and
            profile.graduation_year == self.target_graduation_year
        )

        if self.target_audience == 'department':
            return dept_match
        if self.target_audience == 'graduation_year':
            return grad_match
        if self.target_audience == 'both':
            return dept_match and grad_match
        return True


class Notification(models.Model):
    """
    In-app alert notification delivered to individual students.
    Strictly isolated per recipient with database indexes for high-throughput queries.
    """
    NOTIFICATION_TYPE_CHOICES = (
        ('announcement', 'Campus Announcement'),
        ('event_reminder', 'Event Reminder'),
        ('event_rsvp', 'Event RSVP'),
        ('waitlist_promotion', 'Waitlist Promotion'),
        ('club_application', 'Club Application'),
        ('club_application_approved', 'Club Application Approved'),
        ('club_application_rejected', 'Club Application Rejected'),
        ('club_post', 'Club Post'),
        ('system', 'System Alert'),
    )

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True
    )
    notification_type = models.CharField(
        max_length=32,
        choices=NOTIFICATION_TYPE_CHOICES,
        db_index=True
    )
    title = models.CharField(max_length=200)
    message = models.TextField()

    # Optional relational links
    related_event = models.ForeignKey(
        Event,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    related_club = models.ForeignKey(
        Club,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    related_announcement = models.ForeignKey(
        Announcement,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    link_url = models.CharField(max_length=255, blank=True)

    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['recipient', '-created_at']),
        ]

    def __str__(self):
        return f"[{self.notification_type}] -> {self.recipient.email}: {self.title}"


class NotificationPreference(models.Model):
    """
    User configurable notification delivery preferences.
    Controls categories of notifications received and email notifications.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    announcements = models.BooleanField(default=True)
    event_reminders = models.BooleanField(default=True)
    rsvp_updates = models.BooleanField(default=True)
    waitlist_promotions = models.BooleanField(default=True)
    club_activity = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Preferences for {self.user.email}"


class ClubMessage(models.Model):
    """
    Real-time community chat messages within a student club.
    Persisted to the database with soft-deletion and member boundaries.
    """
    club = models.ForeignKey(
        Club,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='club_messages'
    )
    content = models.TextField()
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['club', 'created_at']),
        ]

    def __str__(self):
        return f"Msg by {self.sender.email} in {self.club.name} ({self.created_at})"


class EventQuestion(models.Model):
    """
    Student questions posted on event pages for interactive community Q&A.
    """
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='event_questions'
    )
    content = models.TextField()
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']
        indexes = [
            models.Index(fields=['event', '-is_pinned', '-created_at']),
        ]

    def __str__(self):
        return f"Q: {self.content[:40]} by {self.author.email}"

    @property
    def upvotes_count(self):
        return self.upvotes.count()


class EventQuestionUpvote(models.Model):
    """
    Tracks student upvotes on event questions.
    """
    question = models.ForeignKey(
        EventQuestion,
        on_delete=models.CASCADE,
        related_name='upvotes'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='question_upvotes'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['question', 'user'],
                name='unique_user_question_upvote'
            )
        ]

    def __str__(self):
        return f"Upvote by {self.user.email} on Q#{self.question_id}"


class EventAnswer(models.Model):
    """
    Answers to event questions. Answers by organizers or club leaders can be marked official.
    """
    question = models.ForeignKey(
        EventQuestion,
        on_delete=models.CASCADE,
        related_name='answers'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='event_answers'
    )
    content = models.TextField()
    is_official = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_official', 'created_at']

    def __str__(self):
        return f"A by {self.author.email} (Official: {self.is_official})"


class EventTicket(models.Model):
    """
    Digital event tickets with cryptographically unpredictable codes and vector QR payload.
    Generated upon confirmed RSVP and validated server-side during organizer check-in.
    """
    STATUS_CHOICES = (
        ('valid', 'Valid'),
        ('used', 'Used / Checked In'),
        ('cancelled', 'Cancelled'),
    )

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='tickets'
    )
    attendee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='event_tickets'
    )
    rsvp = models.OneToOneField(
        EventRSVP,
        on_delete=models.CASCADE,
        related_name='ticket',
        null=True,
        blank=True
    )
    ticket_code = models.CharField(max_length=64, unique=True, db_index=True)
    qr_payload = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='valid',
        db_index=True
    )
    is_checked_in = models.BooleanField(default=False, db_index=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_in_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='scanned_tickets'
    )

    class Meta:
        ordering = ['-issued_at']
        constraints = [
            models.UniqueConstraint(
                fields=['event', 'attendee'],
                name='unique_event_attendee_ticket'
            )
        ]
        indexes = [
            models.Index(fields=['ticket_code']),
            models.Index(fields=['event', 'status']),
            models.Index(fields=['event', 'status', 'is_checked_in']),
        ]

    def __str__(self):
        return f"Ticket {self.ticket_code} - {self.event.title} ({self.status})"

    @property
    def qr_code_svg(self):
        try:
            import qrcode
            import qrcode.image.svg
            factory = qrcode.image.svg.SvgPathImage
            img = qrcode.make(self.qr_payload or self.ticket_code, image_factory=factory)
            return img.to_string().decode('utf-8')
        except Exception:
            return ""

    @classmethod
    def generate_ticket_code(cls):
        import secrets
        return f"CH-TKT-{secrets.token_hex(6).upper()}"


# ==============================================================================
# Institutional Opportunity & Innovation Modules
# ==============================================================================

class Opportunity(models.Model):
    """
    Institutional opportunities: Internships, Hackathons, Workshops,
    Competitions, Scholarships, Certifications, and Placement Opportunities.
    """
    OPPORTUNITY_TYPE_CHOICES = (
        ('internship', 'Internship'),
        ('hackathon', 'Hackathon'),
        ('workshop', 'Workshop'),
        ('competition', 'Competition'),
        ('scholarship', 'Scholarship'),
        ('certification', 'Certification'),
        ('placement', 'Placement Opportunity'),
    )

    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('pending_approval', 'Pending Approval'),
        ('approved', 'Approved'),
        ('published', 'Published'),
        ('closed', 'Closed'),
    )

    title = models.CharField(max_length=200)
    organization = models.CharField(max_length=150)
    opportunity_type = models.CharField(
        max_length=30,
        choices=OPPORTUNITY_TYPE_CHOICES,
        default='internship',
        db_index=True
    )
    description = models.TextField()
    location = models.CharField(max_length=150, blank=True)
    stipend_or_prize = models.CharField(max_length=100, blank=True)
    deadline = models.DateTimeField(db_index=True)
    apply_url = models.CharField(max_length=500, blank=True)
    eligibility_criteria = models.TextField(blank=True)
    department = models.CharField(max_length=100, blank=True)
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='published',
        db_index=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_opportunities'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_opportunities'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['deadline']
        indexes = [
            models.Index(fields=['opportunity_type', 'status']),
            models.Index(fields=['deadline', 'status']),
        ]

    def __str__(self):
        return f"{self.title} ({self.organization}) [{self.opportunity_type}]"

    @property
    def applications_count(self):
        if hasattr(self, 'annotated_applications_count'):
            return self.annotated_applications_count
        return self.applications.count()


class OpportunityApplication(models.Model):
    """
    Student application for an institutional opportunity.
    """
    STATUS_CHOICES = (
        ('applied', 'Applied'),
        ('reviewed', 'Reviewed'),
        ('shortlisted', 'Shortlisted'),
        ('rejected', 'Rejected'),
    )

    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.CASCADE,
        related_name='applications'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='opportunity_applications'
    )
    resume_url = models.URLField(max_length=500, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='applied',
        db_index=True
    )
    applied_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-applied_at']
        constraints = [
            models.UniqueConstraint(
                fields=['opportunity', 'student'],
                name='unique_student_opportunity_application'
            )
        ]
        indexes = [
            models.Index(fields=['opportunity', 'status']),
            models.Index(fields=['student', 'status']),
        ]

    def __str__(self):
        return f"{self.student.email} -> {self.opportunity.title} ({self.status})"


# ==============================================================================
# Unified Institutional Approval Center
# ==============================================================================

class ApprovalRequest(models.Model):
    """
    Unified approval queue for: Events, Clubs, Announcements, Opportunities,
    and Coordinator permissions.
    """
    ITEM_TYPE_CHOICES = (
        ('event', 'Event'),
        ('club', 'Club'),
        ('announcement', 'Announcement'),
        ('opportunity', 'Opportunity'),
        ('coordinator_request', 'Coordinator Request'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('changes_requested', 'Changes Requested'),
    )

    item_type = models.CharField(max_length=30, choices=ITEM_TYPE_CHOICES, db_index=True)
    item_id = models.PositiveIntegerField(db_index=True)
    title = models.CharField(max_length=200)
    summary = models.TextField()
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='requested_approvals'
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_approvals'
    )
    reviewer_notes = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['item_type', 'status']),
            models.Index(fields=['status', '-created_at']),
        ]

    def __str__(self):
        return f"[{self.item_type.upper()}] {self.title} - {self.status}"


# ==============================================================================
# Security & Audit Logs
# ==============================================================================

class AuditLog(models.Model):
    """
    Administrative audit trail capturing actor, action, resource, timestamp, and metadata.
    """
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=64, db_index=True)
    resource_type = models.CharField(max_length=64, db_index=True)
    resource_id = models.CharField(max_length=64, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.CharField(max_length=45, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['actor', 'created_at']),
        ]

    def __str__(self):
        actor_email = self.actor.email if self.actor else 'SYSTEM'
        return f"{self.created_at.strftime('%Y-%m-%d %H:%M')} | {actor_email} -> {self.action} ({self.resource_type})"


# ==============================================================================
# Institutional System Settings
# ==============================================================================

class SystemSetting(models.Model):
    """
    Institutional configuration: College identity, academic calendar, active semester,
    TPO season toggles, registration controls, and emergency broadcast flags.
    """
    key = models.CharField(max_length=64, unique=True, db_index=True)
    value = models.JSONField(default=dict)
    description = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        ordering = ['key']

    def __str__(self):
        return f"Setting: {self.key}"


# ==============================================================================
# KPRIT Training & Placement Office (TPO) Modules
# ==============================================================================

class Company(models.Model):
    """
    Recruiting corporate partners and companies visiting KPRIT.
    """
    TIER_CHOICES = (
        ('Super Dream', 'Super Dream (>12 LPA)'),
        ('Dream', 'Dream (7-12 LPA)'),
        ('Tier 1', 'Tier 1 (4.5-7 LPA)'),
        ('Tier 2', 'Tier 2 (<4.5 LPA)'),
    )

    name = models.CharField(max_length=150, unique=True, db_index=True)
    industry = models.CharField(max_length=100, blank=True, db_index=True)
    tier = models.CharField(max_length=30, choices=TIER_CHOICES, default='Tier 1')
    website = models.URLField(blank=True)
    contact_person = models.CharField(max_length=100, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=150, blank=True)
    logo_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Companies'

    def __str__(self):
        return f"{self.name} ({self.tier})"

    @property
    def active_drives_count(self):
        return self.drives.filter(status='active').count()


class PlacementDrive(models.Model):
    """
    Placement and recruitment drive hosted for KPRIT students.
    Eligibility criteria are database-driven (CGPA, backlogs, branches, graduation year).
    """
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('active', 'Active / Applications Open'),
        ('in_progress', 'Drive in Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='drives'
    )
    title = models.CharField(max_length=200)
    job_role = models.CharField(max_length=100, db_index=True)
    job_description = models.TextField(blank=True)
    package_lpa = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        help_text="Compensation in Lakhs Per Annum (INR)"
    )
    drive_date = models.DateTimeField(null=True, blank=True, db_index=True)
    application_deadline = models.DateTimeField(db_index=True)

    # Database-Driven Eligibility Rules
    eligibility_min_cgpa = models.DecimalField(max_digits=4, decimal_places=2, default=6.00)
    eligibility_max_backlogs = models.PositiveIntegerField(default=0)
    eligibility_departments = models.JSONField(
        default=list,
        help_text="List of eligible department codes e.g. ['CSE', 'ECE', 'CSM', 'CSD', 'IT']"
    )
    eligibility_graduation_year = models.PositiveIntegerField(
        default=2026,
        help_text="Eligible graduating batch year"
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='active',
        db_index=True
    )
    venue_or_link = models.CharField(max_length=255, blank=True)
    rounds_description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_drives'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-drive_date', '-created_at']
        indexes = [
            models.Index(fields=['status', 'application_deadline']),
            models.Index(fields=['eligibility_graduation_year', 'status']),
            models.Index(fields=['status', 'drive_date']),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.job_role} ({self.package_lpa} LPA)"

    @property
    def applications_count(self):
        if hasattr(self, 'annotated_applications_count'):
            return self.annotated_applications_count
        return self.applications.count()

    @property
    def selected_count(self):
        if hasattr(self, 'annotated_selected_count'):
            return self.annotated_selected_count
        return self.applications.filter(status='selected').count()

    def is_student_eligible(self, student_user):
        """
        Calculates student eligibility against database-driven parameters.
        Returns (is_eligible: bool, reasons: list[str])
        """
        if not student_user or not student_user.is_authenticated:
            return False, ["User is not authenticated."]

        profile = getattr(student_user, 'profile', None)
        if not profile:
            return False, ["Student profile record not found."]

        reasons = []

        # Graduation year check
        if self.eligibility_graduation_year:
            if profile.graduation_year != self.eligibility_graduation_year:
                reasons.append(
                    f"Graduation year mismatch: requires {self.eligibility_graduation_year}, profile has {profile.graduation_year or 'Unset'}."
                )

        # Department check
        if self.eligibility_departments and len(self.eligibility_departments) > 0:
            student_dept = (profile.department or '').strip().upper()
            eligible_depts = [d.strip().upper() for d in self.eligibility_departments]
            if student_dept not in eligible_depts:
                reasons.append(
                    f"Department not eligible: requires one of {', '.join(eligible_depts)}, profile is {student_dept or 'Unset'}."
                )

        # CGPA check
        if self.eligibility_min_cgpa:
            student_cgpa = profile.cgpa or 0.00
            if student_cgpa < self.eligibility_min_cgpa:
                reasons.append(
                    f"Minimum CGPA required is {self.eligibility_min_cgpa}, profile has {student_cgpa}."
                )

        # Backlogs check
        student_backlogs = profile.backlogs or 0
        if student_backlogs > self.eligibility_max_backlogs:
            reasons.append(
                f"Maximum backlogs allowed is {self.eligibility_max_backlogs}, profile has {student_backlogs}."
            )

        # Deadline check
        if timezone.now() > self.application_deadline:
            reasons.append("Application deadline has passed.")

        # Status check
        if self.status != 'active':
            reasons.append(f"Placement drive is not active (current status: {self.status}).")

        return len(reasons) == 0, reasons


class PlacementApplication(models.Model):
    """
    Student formal registration for a KPRIT recruitment drive.
    """
    STATUS_CHOICES = (
        ('applied', 'Applied'),
        ('shortlisted', 'Shortlisted'),
        ('interview_scheduled', 'Interview Scheduled'),
        ('selected', 'Selected / Offered'),
        ('rejected', 'Rejected'),
    )

    drive = models.ForeignKey(
        PlacementDrive,
        on_delete=models.CASCADE,
        related_name='applications'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='placement_applications'
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='applied',
        db_index=True
    )
    cgpa_at_application = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True
    )
    resume_url = models.URLField(max_length=500, blank=True)
    status_notes = models.TextField(blank=True)
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-applied_at']
        constraints = [
            models.UniqueConstraint(
                fields=['drive', 'student'],
                name='unique_student_drive_application'
            )
        ]
        indexes = [
            models.Index(fields=['drive', 'status']),
            models.Index(fields=['student', 'status']),
        ]

    def __str__(self):
        return f"{self.student.email} -> {self.drive} ({self.status})"


class PlacementInterview(models.Model):
    """
    Scheduled interview rounds for candidates in a placement drive.
    """
    STATUS_CHOICES = (
        ('scheduled', 'Scheduled'),
        ('cleared', 'Cleared / Recommended'),
        ('failed', 'Not Cleared'),
        ('absent', 'Absent'),
    )

    application = models.ForeignKey(
        PlacementApplication,
        on_delete=models.CASCADE,
        related_name='interviews'
    )
    round_name = models.CharField(max_length=100)
    scheduled_at = models.DateTimeField()
    mode = models.CharField(max_length=20, default='offline', choices=(('online', 'Online'), ('offline', 'Offline')))
    venue_or_link = models.CharField(max_length=255, blank=True)
    interviewer_notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='scheduled',
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_at']

    def __str__(self):
        return f"Interview: {self.round_name} for {self.application.student.email} ({self.status})"


