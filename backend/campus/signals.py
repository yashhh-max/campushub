"""
Signal handlers for automatic Redis cache invalidation upon model mutations.
Ensures 10,000 concurrent students receive fresh data immediately after updates
while enjoying sub-millisecond cached reads during static periods.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import (
    Event, EventRSVP, Club, ClubMembership, Announcement,
    Opportunity, Company, PlacementDrive, Department
)
from .cache_utils import invalidate_cache_prefix


@receiver([post_save, post_delete], sender=Event)
@receiver([post_save, post_delete], sender=EventRSVP)
def invalidate_event_cache(sender, instance, **kwargs):
    invalidate_cache_prefix('events')


@receiver([post_save, post_delete], sender=Club)
@receiver([post_save, post_delete], sender=ClubMembership)
def invalidate_club_cache(sender, instance, **kwargs):
    invalidate_cache_prefix('clubs')


@receiver([post_save, post_delete], sender=Announcement)
def invalidate_announcement_cache(sender, instance, **kwargs):
    invalidate_cache_prefix('announcements')


@receiver([post_save, post_delete], sender=Opportunity)
@receiver([post_save, post_delete], sender=Company)
@receiver([post_save, post_delete], sender=PlacementDrive)
def invalidate_opportunity_cache(sender, instance, **kwargs):
    invalidate_cache_prefix('opportunities')
    invalidate_cache_prefix('placements')


@receiver([post_save, post_delete], sender=Department)
def invalidate_department_cache(sender, instance, **kwargs):
    invalidate_cache_prefix('departments')
