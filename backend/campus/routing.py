"""
WebSocket URL routing for CampusHub Phase 6.
"""

from django.urls import re_path, path
from . import consumers

websocket_urlpatterns = [
    path("ws/notifications/", consumers.NotificationConsumer.as_asgi()),
    path("ws/clubs/<int:club_id>/chat/", consumers.ClubChatConsumer.as_asgi()),
    path("ws/events/<int:event_id>/qa/", consumers.EventQAConsumer.as_asgi()),
    path("ws/events/<int:event_id>/attendance/", consumers.EventAttendanceConsumer.as_asgi()),
]
