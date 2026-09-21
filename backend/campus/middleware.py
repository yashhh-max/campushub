"""
ASGI JWT Authentication Middleware for Django Channels.
Extracts JWT access tokens from WebSocket query strings (?token=...)
and populates scope['user'] with authenticated User or AnonymousUser.
"""

from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_string):
    """
    Validates JWT access token string and returns User instance or AnonymousUser.
    """
    if not token_string:
        return AnonymousUser()
    try:
        access_token = AccessToken(token_string)
        user_id = access_token.get('user_id')
        if not user_id:
            return AnonymousUser()
        return User.objects.get(id=user_id, is_active=True)
    except (InvalidToken, TokenError, User.DoesNotExist):
        return AnonymousUser()
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware:
    """
    Custom ASGI middleware that reads JWT from query string `token` parameter.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "websocket":
            query_string = scope.get("query_string", b"").decode("utf-8")
            query_params = parse_qs(query_string)
            token_list = query_params.get("token", [])
            token = token_list[0] if token_list else None

            # Fallback: check subprotocols if token not in query string
            if not token and "subprotocols" in scope:
                for subprotocol in scope.get("subprotocols", []):
                    if subprotocol.startswith("token."):
                        token = subprotocol.replace("token.", "")
                        break

            scope["user"] = await get_user_from_token(token)
        return await self.app(scope, receive, send)


def JWTAuthMiddlewareStack(app):
    return JWTAuthMiddleware(app)
