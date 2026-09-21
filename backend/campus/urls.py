from django.urls import path
from .views import (
    EventListView,
    EventDetailView,
    EventRSVPView,
    MyEventsView,
    EventAttendeesView,
    ClubListView,
    ClubDetailView,
    ClubJoinView,
    ClubLeaveView,
    MyClubsView,
    ClubMembersView,
    ClubMembershipApproveView,
    ClubMembershipRejectView,
    ClubPostListCreateView,
    ClubPostDetailView,
    AnnouncementListView,
    AnnouncementDetailView,
    NotificationListView,
    NotificationUnreadCountView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationDeleteView,
    NotificationPreferenceView,
    ClubMessageListView,
    EventQuestionListCreateView,
    EventQuestionAnswerView,
    EventQuestionUpvoteView,
    EventTicketListView,
    EventTicketDetailView,
    EventCheckInView,
    EventAttendanceView,
    EventAttendanceManualView,
    EventAttendanceExportView,
)

urlpatterns = [
    # Event endpoints
    path('events/', EventListView.as_view(), name='event-list'),
    path('events/my/', MyEventsView.as_view(), name='my-events'),
    path('events/<int:pk>/', EventDetailView.as_view(), name='event-detail'),
    path('events/<int:pk>/rsvp/', EventRSVPView.as_view(), name='event-rsvp'),
    path('events/<int:pk>/attendees/', EventAttendeesView.as_view(), name='event-attendees'),

    # Club endpoints
    path('clubs/', ClubListView.as_view(), name='club-list'),
    path('clubs/my/', MyClubsView.as_view(), name='my-clubs'),
    path('clubs/<str:pk>/', ClubDetailView.as_view(), name='club-detail'),
    path('clubs/<str:pk>/join/', ClubJoinView.as_view(), name='club-join'),
    path('clubs/<str:pk>/leave/', ClubLeaveView.as_view(), name='club-leave'),
    path('clubs/<str:pk>/membership/apply/', ClubJoinView.as_view(), name='club-apply'),
    path('clubs/<str:pk>/members/', ClubMembersView.as_view(), name='club-members'),
    path('clubs/<str:pk>/membership/<int:membership_id>/approve/', ClubMembershipApproveView.as_view(), name='club-membership-approve'),
    path('clubs/<str:pk>/membership/<int:membership_id>/reject/', ClubMembershipRejectView.as_view(), name='club-membership-reject'),

    # Club Community Posts endpoints
    path('clubs/<str:pk>/posts/', ClubPostListCreateView.as_view(), name='club-posts'),
    path('clubs/<str:pk>/posts/<int:post_id>/', ClubPostDetailView.as_view(), name='club-post-detail'),

    # Announcement endpoints
    path('announcements/', AnnouncementListView.as_view(), name='announcement-list'),
    path('announcements/<int:pk>/', AnnouncementDetailView.as_view(), name='announcement-detail'),

    # Notification endpoints
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/unread-count/', NotificationUnreadCountView.as_view(), name='notification-unread-count'),
    path('notifications/<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('notifications/read-all/', NotificationMarkAllReadView.as_view(), name='notification-read-all'),
    path('notifications/<int:pk>/', NotificationDeleteView.as_view(), name='notification-delete'),
    path('notifications/preferences/', NotificationPreferenceView.as_view(), name='notification-preferences'),

    # Phase 6: Club Real-Time Chat messages
    path('clubs/<str:pk_or_slug>/messages/', ClubMessageListView.as_view(), name='club-messages'),

    # Phase 6: Event Q&A endpoints
    path('events/<int:event_id>/questions/', EventQuestionListCreateView.as_view(), name='event-questions'),
    path('events/questions/<int:question_id>/answers/', EventQuestionAnswerView.as_view(), name='event-question-answers'),
    path('events/questions/<int:question_id>/upvote/', EventQuestionUpvoteView.as_view(), name='event-question-upvote'),

    # Phase 6: Event Tickets & Check-In endpoints
    path('tickets/', EventTicketListView.as_view(), name='ticket-list'),
    path('tickets/<str:code_or_id>/', EventTicketDetailView.as_view(), name='ticket-detail'),
    path('events/<int:event_id>/check-in/', EventCheckInView.as_view(), name='event-check-in'),
    path('events/<int:event_id>/attendance/', EventAttendanceView.as_view(), name='event-attendance'),
    path('events/<int:event_id>/attendance/manual/', EventAttendanceManualView.as_view(), name='event-attendance-manual'),
    path('events/<int:event_id>/attendance/export/', EventAttendanceExportView.as_view(), name='event-attendance-export'),
]


