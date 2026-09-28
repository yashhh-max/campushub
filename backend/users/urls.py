from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    MeView,
    AdminUserListView,
    AdminUserDetailView,
    AdminUserToggleActiveView,
    AdminStudentListView,
    AdminFacultyListView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

urlpatterns = [
    # Core Authentication Endpoints
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='auth-password-reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='auth-password-reset-confirm'),

    # Institutional Admin User Management
    path('admin/users/', AdminUserListView.as_view(), name='admin-users-list'),
    path('admin/users/students/', AdminStudentListView.as_view(), name='admin-students-list'),
    path('admin/users/faculty/', AdminFacultyListView.as_view(), name='admin-faculty-list'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/users/<int:pk>/toggle-active/', AdminUserToggleActiveView.as_view(), name='admin-user-toggle-active'),
]
