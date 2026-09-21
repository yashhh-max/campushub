"""
Django Channels WebSocket Consumers for CampusHub Phase 6.
Handles real-time notifications, club chat, event Q&A, and organizer live attendance tracking.
"""

import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    Delivers instant in-app alerts and live unread counter increments directly to the student.
    """

    async def connect(self):
        await self.accept()
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user_id = user.id
        self.group_name = f"user_{self.user_id}_notifications"

        await self.send_json({
            "type": "connection_established",
            "message": "Connected to real-time notification stream.",
            "user_id": self.user_id,
        })

        if self.channel_layer:
            try:
                await self.channel_layer.group_add(self.group_name, self.channel_name)
            except Exception:
                pass

    async def disconnect(self, close_code):
        if hasattr(self, "group_name") and self.channel_layer:
            try:
                await self.channel_layer.group_discard(self.group_name, self.channel_name)
            except Exception:
                pass

    async def receive_json(self, content):
        msg_type = content.get("type")
        if msg_type == "ping":
            await self.send_json({"type": "pong", "timestamp": timezone.now().isoformat()})

    async def notification_message(self, event):
        """
        Handler for messages sent to the user's notification group.
        """
        await self.send_json({
            "type": "notification",
            "notification": event.get("notification"),
            "unread_count": event.get("unread_count"),
        })


class ClubChatConsumer(AsyncJsonWebsocketConsumer):
    """
    Handles real-time community chat inside student clubs.
    Enforces server-side membership verification.
    """

    async def connect(self):
        await self.accept()
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.club_id = self.scope["url_route"]["kwargs"]["club_id"]
        self.group_name = f"club_{self.club_id}_chat"

        # Check membership authorization
        is_member = await self.check_club_membership(user, self.club_id)
        if not is_member:
            await self.close(code=4003)
            return

        await self.send_json({
            "type": "connection_established",
            "message": f"Connected to Club {self.club_id} chat room.",
            "club_id": self.club_id,
        })

        if self.channel_layer:
            try:
                await self.channel_layer.group_add(self.group_name, self.channel_name)
            except Exception:
                pass

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            return

        action = content.get("action")

        if action == "send_message":
            text = (content.get("content") or "").strip()
            if not text:
                await self.send_json({"type": "error", "message": "Message content cannot be empty."})
                return
            if len(text) > 2000:
                await self.send_json({"type": "error", "message": "Message exceeds 2000 characters limit."})
                return

            msg_data = await self.create_club_message(user, self.club_id, text)
            if msg_data:
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "chat_message_broadcast",
                        "message": msg_data,
                    }
                )

        elif action == "delete_message":
            message_id = content.get("message_id")
            if message_id:
                deleted = await self.delete_club_message(user, self.club_id, message_id)
                if deleted:
                    await self.channel_layer.group_send(
                        self.group_name,
                        {
                            "type": "chat_message_deleted",
                            "message_id": message_id,
                        }
                    )

        elif content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    async def chat_message_broadcast(self, event):
        await self.send_json({
            "type": "new_message",
            "message": event["message"],
        })

    async def chat_message_deleted(self, event):
        await self.send_json({
            "type": "message_deleted",
            "message_id": event["message_id"],
        })

    @database_sync_to_async
    def check_club_membership(self, user, club_id):
        from .models import Club, ClubMembership
        if user.is_staff or user.role == "admin":
            return True
        try:
            club = Club.objects.get(id=club_id)
            if club.leader_id == user.id:
                return True
            return ClubMembership.objects.filter(
                club=club,
                user=user,
                status="approved"
            ).exists()
        except Club.DoesNotExist:
            return False

    @database_sync_to_async
    def create_club_message(self, user, club_id, content):
        from .models import Club, ClubMessage
        try:
            club = Club.objects.get(id=club_id)
            msg = ClubMessage.objects.create(
                club=club,
                sender=user,
                content=content,
            )
            return {
                "id": msg.id,
                "club_id": club.id,
                "sender_id": user.id,
                "sender_name": getattr(user, "full_name", "") or user.email,
                "sender_email": user.email,
                "sender_role": getattr(user, "role", "student"),
                "content": msg.content,
                "is_deleted": False,
                "created_at": msg.created_at.isoformat(),
            }
        except Exception:
            return None

    @database_sync_to_async
    def delete_club_message(self, user, club_id, message_id):
        from .models import Club, ClubMessage, ClubMembership
        try:
            msg = ClubMessage.objects.get(id=message_id, club_id=club_id)
            if msg.sender_id == user.id or user.is_staff or user.role == "admin":
                msg.is_deleted = True
                msg.save(update_fields=["is_deleted", "updated_at"])
                return True
            # Club leader or officer check
            club = Club.objects.get(id=club_id)
            if club.leader_id == user.id:
                msg.is_deleted = True
                msg.save(update_fields=["is_deleted", "updated_at"])
                return True
            is_officer = ClubMembership.objects.filter(
                club=club,
                user=user,
                status="approved",
                role__in=["moderator", "vice_president", "president"]
            ).exists()
            if is_officer:
                msg.is_deleted = True
                msg.save(update_fields=["is_deleted", "updated_at"])
                return True
            return False
        except Exception:
            return False


class EventQAConsumer(AsyncJsonWebsocketConsumer):
    """
    Broadcasts real-time Q&A questions, organizer answers, and upvotes on event pages.
    """

    async def connect(self):
        await self.accept()
        self.event_id = self.scope["url_route"]["kwargs"]["event_id"]
        self.group_name = f"event_{self.event_id}_qa"

        await self.channel_layer.group_add(self.group_name, self.channel_name)

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def qa_question_created(self, event):
        await self.send_json({
            "type": "question_created",
            "question": event["question"],
        })

    async def qa_answer_created(self, event):
        await self.send_json({
            "type": "answer_created",
            "question_id": event["question_id"],
            "answer": event["answer"],
        })

    async def qa_question_upvoted(self, event):
        await self.send_json({
            "type": "question_upvoted",
            "question_id": event["question_id"],
            "upvotes_count": event["upvotes_count"],
        })


class EventAttendanceConsumer(AsyncJsonWebsocketConsumer):
    """
    Live WebSocket channel for event organizers. Pushes instant check-in count and attendee status.
    """

    async def connect(self):
        await self.accept()
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.event_id = self.scope["url_route"]["kwargs"]["event_id"]
        self.group_name = f"event_{self.event_id}_attendance"

        is_authorized = await self.check_organizer_authorization(user, self.event_id)
        if not is_authorized:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)

        await self.send_json({
            "type": "connection_established",
            "message": f"Connected to Event {self.event_id} attendance live stream.",
            "event_id": self.event_id,
        })

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def attendance_update(self, event):
        await self.send_json({
            "type": "attendance_update",
            "event_id": event["event_id"],
            "attendee": event.get("attendee"),
            "checked_in_count": event.get("checked_in_count"),
            "registered_count": event.get("registered_count"),
            "checkin_percentage": event.get("checkin_percentage"),
        })

    @database_sync_to_async
    def check_organizer_authorization(self, user, event_id):
        from .models import Event, ClubMembership
        if user.is_staff or user.role == "admin":
            return True
        try:
            event = Event.objects.select_related("club").get(id=event_id)
            if event.created_by_id == user.id:
                return True
            if event.club.leader_id == user.id:
                return True
            return ClubMembership.objects.filter(
                club=event.club,
                user=user,
                status="approved",
                role__in=["moderator", "vice_president", "president"]
            ).exists()
        except Event.DoesNotExist:
            return False
