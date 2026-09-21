"""
URL configuration for campushub project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Phase 1 Health check endpoints
    path('api/health/', include('core.urls')),
    # Phase 2 Authentication endpoints
    path('api/auth/', include('users.urls')),
    # Phase 2 Campus domain endpoints (/api/events/, /api/clubs/, /api/announcements/)
    path('api/', include('campus.urls')),
]
