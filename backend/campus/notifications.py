"""
CampusHub Notification & Email Alert Engine.
Handles in-app notification persistence, preference enforcement,
idempotent deduplication, and production-ready email alerts with console fallback.
"""

import logging
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from .models import Notification, NotificationPreference

logger = logging.getLogger(__name__)
User = get_user_model()


def broadcast_user_notification(user_id, notification, unread_count=None):
    """
    Broadcasts live notification to the student's personal WebSocket group.
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        group_name = f"user_{user_id}_notifications"
        if unread_count is None:
            unread_count = Notification.objects.filter(recipient_id=user_id, is_read=False).count()
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "notification_message",
                "notification": {
                    "id": notification.id,
                    "recipient": user_id,
                    "notification_type": notification.notification_type,
                    "title": notification.title,
                    "message": notification.message,
                    "related_event": notification.related_event_id,
                    "related_club": notification.related_club_id,
                    "related_announcement": notification.related_announcement_id,
                    "link_url": notification.link_url,
                    "is_read": notification.is_read,
                    "created_at": notification.created_at.isoformat(),
                },
                "unread_count": unread_count,
            }
        )
    except Exception as e:
        logger.warning(f"Could not broadcast real-time notification to user {user_id}: {e}")


def get_user_preferences(user):
    """
    Retrieves or creates default notification preferences for the user.
    """
    preferences, _ = NotificationPreference.objects.get_or_create(user=user)
    return preferences


def is_notification_allowed(user, notification_type):
    """
    Checks whether the user allows notifications for the given notification type.
    System alerts are always delivered.
    """
    prefs = get_user_preferences(user)

    if notification_type == 'announcement':
        return prefs.announcements
    elif notification_type == 'event_reminder':
        return prefs.event_reminders
    elif notification_type == 'event_rsvp':
        return prefs.rsvp_updates
    elif notification_type == 'waitlist_promotion':
        return prefs.waitlist_promotions
    elif notification_type in (
        'club_application',
        'club_application_approved',
        'club_application_rejected',
        'club_post',
    ):
        return prefs.club_activity
    elif notification_type == 'system':
        return True
    return True


def send_notification(
    recipient,
    notification_type,
    title,
    message,
    related_event=None,
    related_club=None,
    related_announcement=None,
    link_url='',
    dedup_minutes=5,
):
    """
    Creates an in-app Notification record and dispatches an email alert
    if the user has email notifications enabled.
    Enforces preference gates and deduplication.
    """
    if not recipient or not recipient.is_active:
        return None

    # Gate 1: Check category preference
    if not is_notification_allowed(recipient, notification_type):
        return None

    # Gate 2: Idempotent Deduplication
    if dedup_minutes > 0:
        window_start = timezone.now() - timedelta(minutes=dedup_minutes)
        existing = Notification.objects.filter(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            created_at__gte=window_start,
        ).first()
        if existing:
            return existing

    # Create In-App Notification
    notification = Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        related_event=related_event,
        related_club=related_club,
        related_announcement=related_announcement,
        link_url=link_url,
    )

    # Real-Time WebSocket Push to Connected Browser
    unread_count = Notification.objects.filter(recipient=recipient, is_read=False).count()
    broadcast_user_notification(recipient.id, notification, unread_count=unread_count)

    # Dispatch Email Alert if enabled in preferences
    prefs = get_user_preferences(recipient)
    if prefs.email_notifications and recipient.email:
        try:
            subject = f"[CampusHub] {title}"
            email_body_text = (
                f"Hello {recipient.full_name or recipient.email},\n\n"
                f"{message}\n\n"
                f"View details on CampusHub: {settings.CORS_ALLOWED_ORIGINS[0] if getattr(settings, 'CORS_ALLOWED_ORIGINS', None) else 'http://localhost:3000'}{link_url}\n\n"
                f"—\nCampusHub Collegiate Platform\n"
                f"Manage notification preferences: http://localhost:3000/dashboard/settings/notifications"
            )

            html_body = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 24px; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 700;">CampusHub State University</h1>
                    <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Campus Alert & Activity Notification</p>
                </div>
                <div style="padding: 24px; color: #1e293b;">
                    <h2 style="font-size: 18px; margin-top: 0; color: #0f172a;">{title}</h2>
                    <p style="font-size: 15px; line-height: 1.6; color: #334155;">{message}</p>
                    {f'<div style="margin-top: 20px;"><a href="http://localhost:3000{link_url}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Open in CampusHub</a></div>' if link_url else ''}
                </div>
                <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                    <p style="margin: 0;">You received this notification because of your CampusHub notification preferences.</p>
                    <p style="margin: 4px 0 0 0;"><a href="http://localhost:3000/dashboard/settings/notifications" style="color: #4f46e5; text-decoration: underline;">Update notification preferences</a></p>
                </div>
            </div>
            """

            send_mail(
                subject=subject,
                message=email_body_text,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@campushub.edu'),
                recipient_list=[recipient.email],
                html_message=html_body,
                fail_silently=True,
            )
        except Exception as e:
            logger.warning(f"Failed to dispatch email for notification {notification.id}: {e}")

    return notification


# --- Specialized Trigger Helpers ---

def notify_club_application_approved(membership):
    """
    Triggered when a club leader approves a student's membership.
    """
    club = membership.club
    recipient = membership.user
    title = f"Membership Approved: {club.name}"
    message = (
        f"Congratulations! Your membership application for {club.name} has been approved. "
        f"You are now registered as a {membership.get_role_display()}."
    )
    link_url = f"/clubs/{club.slug or club.id}"
    return send_notification(
        recipient=recipient,
        notification_type='club_application_approved',
        title=title,
        message=message,
        related_club=club,
        link_url=link_url,
    )


def notify_club_application_rejected(membership):
    """
    Triggered when a club leader rejects an application.
    """
    club = membership.club
    recipient = membership.user
    title = f"Membership Update: {club.name}"
    message = (
        f"Your recent membership application for {club.name} was not accepted at this time. "
        f"You are welcome to explore other campus organizations."
    )
    link_url = f"/clubs/{club.slug or club.id}"
    return send_notification(
        recipient=recipient,
        notification_type='club_application_rejected',
        title=title,
        message=message,
        related_club=club,
        link_url=link_url,
    )


def notify_event_rsvp_confirmed(rsvp):
    """
    Triggered when a student successfully RSVPs for an event.
    """
    event = rsvp.event
    recipient = rsvp.user
    title = f"RSVP Confirmed: {event.title}"
    start_str = event.start_time.strftime("%b %d, %Y at %I:%M %p")
    message = (
        f"Your registration for '{event.title}' is confirmed! "
        f"Join us at {event.location} on {start_str}."
    )
    link_url = f"/events/{event.id}"
    return send_notification(
        recipient=recipient,
        notification_type='event_rsvp',
        title=title,
        message=message,
        related_event=event,
        related_club=event.club,
        link_url=link_url,
    )


def notify_event_waitlist_joined(rsvp):
    """
    Triggered when a student joins an event waitlist.
    """
    event = rsvp.event
    recipient = rsvp.user
    title = f"Waitlist Joined: {event.title}"
    pos = rsvp.waitlist_position or "queue"
    message = (
        f"You have been added to the waitlist for '{event.title}' at position #{pos}. "
        f"If a registered attendee cancels, you will automatically be promoted to confirmed attendee."
    )
    link_url = f"/events/{event.id}"
    return send_notification(
        recipient=recipient,
        notification_type='event_rsvp',
        title=title,
        message=message,
        related_event=event,
        related_club=event.club,
        link_url=link_url,
    )


def notify_event_waitlist_promoted(rsvp):
    """
    Triggered when an attendee cancels and this waitlisted student is automatically promoted.
    """
    event = rsvp.event
    recipient = rsvp.user
    title = f"You're In! Promoted from Waitlist: {event.title}"
    start_str = event.start_time.strftime("%b %d, %Y at %I:%M %p")
    message = (
        f"Great news! A seat opened up for '{event.title}'. "
        f"You have been automatically promoted from the waitlist to confirmed attendee for {start_str}."
    )
    link_url = f"/events/{event.id}"
    return send_notification(
        recipient=recipient,
        notification_type='waitlist_promotion',
        title=title,
        message=message,
        related_event=event,
        related_club=event.club,
        link_url=link_url,
    )


def notify_announcement_published(announcement):
    """
    Dispatches notifications to all students matching the announcement target audience.
    """
    if not announcement.is_published or not announcement.is_currently_active:
        return 0

    students_query = User.objects.filter(is_active=True)

    if announcement.target_audience == 'everyone':
        recipients = students_query
    elif announcement.target_audience == 'department':
        if announcement.target_department:
            recipients = students_query.filter(
                profile__department__iexact=announcement.target_department.strip()
            )
        else:
            recipients = students_query
    elif announcement.target_audience == 'graduation_year':
        if announcement.target_graduation_year:
            recipients = students_query.filter(
                profile__graduation_year=announcement.target_graduation_year
            )
        else:
            recipients = students_query
    elif announcement.target_audience == 'both':
        recipients = students_query
        if announcement.target_department:
            recipients = recipients.filter(
                profile__department__iexact=announcement.target_department.strip()
            )
        if announcement.target_graduation_year:
            recipients = recipients.filter(
                profile__graduation_year=announcement.target_graduation_year
            )
    else:
        recipients = students_query

    title = f"[{announcement.priority.upper()}] {announcement.title}"
    message = announcement.content[:240] + ('...' if len(announcement.content) > 240 else '')
    link_url = f"/#announcements"

    dispatched_count = 0
    # Process recipients
    for user in recipients.iterator():
        notif = send_notification(
            recipient=user,
            notification_type='announcement',
            title=title,
            message=message,
            related_announcement=announcement,
            link_url=link_url,
            dedup_minutes=30,  # Prevent repeated announcement notification
        )
        if notif:
            dispatched_count += 1

    return dispatched_count


def notify_club_post_published(post):
    """
    Notifies all approved club members when a new post or announcement is published in the club.
    """
    club = post.club
    approved_memberships = club.memberships.filter(
        status='approved'
    ).exclude(user=post.author).select_related('user')

    title = f"[{club.name}] New {post.get_post_type_display()}: {post.title}"
    snippet = post.content[:200] + ('...' if len(post.content) > 200 else '')
    link_url = f"/clubs/{club.slug or club.id}"

    count = 0
    for membership in approved_memberships:
        notif = send_notification(
            recipient=membership.user,
            notification_type='club_post',
            title=title,
            message=snippet,
            related_club=club,
            link_url=link_url,
            dedup_minutes=15,
        )
        if notif:
            count += 1
    return count


def notify_event_reminder(rsvp, reminder_type='24h'):
    """
    Sends an event reminder to an active attending attendee.
    """
    event = rsvp.event
    recipient = rsvp.user
    time_label = "24 hours" if reminder_type == '24h' else "1 hour"
    title = f"Reminder: '{event.title}' starts in {time_label}"
    start_str = event.start_time.strftime("%b %d, %Y at %I:%M %p")
    message = (
        f"Friendly reminder that '{event.title}' begins in {time_label} ({start_str}) "
        f"at {event.location}. Please arrive a few minutes early."
    )
    link_url = f"/events/{event.id}"
    return send_notification(
        recipient=recipient,
        notification_type='event_reminder',
        title=title,
        message=message,
        related_event=event,
        related_club=event.club,
        link_url=link_url,
        dedup_minutes=120,
    )
