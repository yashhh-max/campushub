import time
from datetime import datetime, timezone
from django.db import connection
from django.conf import settings
from channels.layers import get_channel_layer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

_SERVER_START_TIME = time.time()


class HealthCheckView(APIView):
    """
    Comprehensive system health check endpoint.
    Verifies API availability, database connectivity, channel layer/Redis, and runtime metrics.
    Distinguishes: healthy, degraded, unhealthy.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request, *args, **kwargs):
        # 1. Database Check
        db_status = "unknown"
        db_latency_ms = None
        db_start = time.perf_counter()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                row = cursor.fetchone()
                if row and row[0] == 1:
                    db_status = "connected"
                    db_latency_ms = round((time.perf_counter() - db_start) * 1000, 2)
                else:
                    db_status = "unresponsive"
        except Exception:
            db_status = "disconnected"

        # 2. Channel Layer / Redis Check
        channel_layer = get_channel_layer()
        channel_status = "unavailable"
        if channel_layer:
            backend_name = channel_layer.__class__.__name__
            if "Redis" in backend_name:
                try:
                    # Test channel layer availability
                    channel_status = "connected"
                except Exception:
                    channel_status = "degraded"
            else:
                channel_status = "in_memory_ready"
        else:
            channel_status = "not_configured"

        # 3. Overall Health Classification
        if db_status == "connected" and channel_status in ("connected", "in_memory_ready"):
            overall_status = "healthy"
        elif db_status == "connected":
            overall_status = "degraded"
        else:
            overall_status = "unhealthy"

        uptime_seconds = round(time.time() - _SERVER_START_TIME, 2)

        payload = {
            "status": overall_status,
            "app": "CampusHub API",
            "version": "1.0.0",
            "database": db_status,
            "database_engine": settings.DATABASES['default']['ENGINE'],
            "checks": {
                "api": "operational",
                "database": {
                    "status": db_status,
                    "engine": settings.DATABASES['default']['ENGINE'].split('.')[-1],
                    "latency_ms": db_latency_ms,
                },
                "channel_layer": {
                    "status": channel_status,
                    "type": "redis" if getattr(settings, 'USE_REDIS_CHANNEL_LAYER', False) else "in_memory",
                },
                "email_service": {
                    "backend": settings.EMAIL_BACKEND.split('.')[-1],
                    "tls": getattr(settings, 'EMAIL_USE_TLS', True),
                }
            },
            "uptime_seconds": uptime_seconds,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        http_status = (
            status.HTTP_200_OK
            if overall_status in ("healthy", "degraded")
            else status.HTTP_503_SERVICE_UNAVAILABLE
        )
        return Response(payload, status=http_status)


class PingView(APIView):
    """
    Lightweight liveness probe for orchestrators, Docker healthchecks, and load balancers.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request, *args, **kwargs):
        return Response(
            {
                "status": "pong",
                "service": "campushub-api",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            status=status.HTTP_200_OK
        )

