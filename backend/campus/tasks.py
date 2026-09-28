import logging
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    name="campus.tasks.send_email_async"
)
def send_email_async(self, subject, message, recipient_list, from_email=None, html_message=None):
    """
    Asynchronous Celery task for sending transactional emails.
    Prevents blocking HTTP request threads with external SMTP latency.
    """
    if not recipient_list:
        return {"status": "skipped", "reason": "empty recipient list"}

    from_email = from_email or getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@campushub.edu')

    try:
        sent_count = send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=False,
        )
        return {"status": "success", "sent_count": sent_count}
    except Exception as exc:
        logger.warning(f"Email delivery failed (attempt {self.request.retries + 1}): {exc}")
        try:
            self.retry(exc=exc, countdown=2 ** self.request.retries * 5)
        except Exception:
            logger.error(f"Permanent email delivery failure to {recipient_list}: {exc}")
            return {"status": "failed", "error": str(exc)}


@shared_task(
    name="campus.tasks.broadcast_bulk_notification_async"
)
def broadcast_bulk_notification_async(
    title,
    message,
    notification_type="announcement",
    related_announcement_id=None,
    related_event_id=None,
    related_club_id=None,
    link_url="",
    target_role=None,
    target_department_id=None,
):
    """
    High-concurrency chunked fanout of institutional announcements and alerts.
    Creates Notification records in batches of 500 and pushes to live WebSocket channels.
    """
    from .models import Notification
    from .notifications import broadcast_user_notification

    recipients_qs = User.objects.filter(is_active=True)
    if target_role:
        recipients_qs = recipients_qs.filter(role=target_role)
    if target_department_id:
        recipients_qs = recipients_qs.filter(student_profile__department_id=target_department_id)

    recipient_ids = list(recipients_qs.values_list("id", flat=True))
    total_recipients = len(recipient_ids)
    if not total_recipients:
        return {"status": "no_recipients", "count": 0}

    chunk_size = 500
    created_total = 0

    for i in range(0, total_recipients, chunk_size):
        chunk_ids = recipient_ids[i:i + chunk_size]
        notifications_to_create = [
            Notification(
                recipient_id=uid,
                notification_type=notification_type,
                title=title,
                message=message,
                related_announcement_id=related_announcement_id,
                related_event_id=related_event_id,
                related_club_id=related_club_id,
                link_url=link_url,
                is_read=False,
            )
            for uid in chunk_ids
        ]
        created = Notification.objects.bulk_create(notifications_to_create)
        created_total += len(created)

        # Broadcast live to connected WebSockets in parallel
        for notif in created:
            try:
                broadcast_user_notification(notif.recipient_id, notif)
            except Exception:
                pass

    logger.info(f"Broadcasted notification '{title}' to {created_total} recipients.")
    return {"status": "completed", "total_dispatched": created_total}
