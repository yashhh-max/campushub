from django.urls import path
from .views import HealthCheckView, PingView

urlpatterns = [
    path('', HealthCheckView.as_view(), name='health-check'),
    path('ping/', PingView.as_view(), name='health-ping'),
]
