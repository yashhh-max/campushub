"""
Management command to scan upcoming campus events and dispatch reminders
to attending students at 24 hours and 1 hour before event start time.
"""

from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from campus.models import Event, EventRSVP, Notification
from campus.notifications import notify_event_reminder


class Command(BaseCommand):
    help = 'Dispatches 24-hour and 1-hour pre-event reminders to confirmed attendees.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate reminder dispatch without creating database records or emails.',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        now = timezone.now()
        self.stdout.write(f"[{now.isoformat()}] Scanning upcoming events for reminders (Dry run: {dry_run})...")

        # 1. Check 24h window: events starting between 23 and 25 hours from now
        window_24h_start = now + timedelta(hours=23)
        window_24h_end = now + timedelta(hours=25)
        events_24h = Event.objects.filter(
            is_published=True,
            start_time__gte=window_24h_start,
            start_time__lte=window_24h_end,
        )

        sent_24h_count = 0
        for event in events_24h:
            # Attending RSVPs only
            attending_rsvps = EventRSVP.objects.filter(
                event=event,
                status='attending',
            ).select_related('user')

            for rsvp in attending_rsvps:
                # Check if 24h reminder was already sent
                already_sent = Notification.objects.filter(
                    recipient=rsvp.user,
                    related_event=event,
                    notification_type='event_reminder',
                    title__icontains='24 hours',
                ).exists()

                if not already_sent:
                    if not dry_run:
                        notify_event_reminder(rsvp, reminder_type='24h')
                    sent_24h_count += 1
                    self.stdout.write(f"  [24h Reminder] Sent to {rsvp.user.email} for '{event.title}'")

        # 2. Check 1h window: events starting between 50 and 70 minutes from now
        window_1h_start = now + timedelta(minutes=50)
        window_1h_end = now + timedelta(minutes=70)
        events_1h = Event.objects.filter(
            is_published=True,
            start_time__gte=window_1h_start,
            start_time__lte=window_1h_end,
        )

        sent_1h_count = 0
        for event in events_1h:
            attending_rsvps = EventRSVP.objects.filter(
                event=event,
                status='attending',
            ).select_related('user')

            for rsvp in attending_rsvps:
                already_sent = Notification.objects.filter(
                    recipient=rsvp.user,
                    related_event=event,
                    notification_type='event_reminder',
                    title__icontains='1 hour',
                ).exists()

                if not already_sent:
                    if not dry_run:
                        notify_event_reminder(rsvp, reminder_type='1h')
                    sent_1h_count += 1
                    self.stdout.write(f"  [1h Reminder] Sent to {rsvp.user.email} for '{event.title}'")

        self.stdout.write(
            self.style.SUCCESS(
                f"Completed event reminders: {sent_24h_count} 24h alerts, {sent_1h_count} 1h alerts dispatched."
            )
        )
