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
    DepartmentListView,
    DepartmentDetailView,
    ApprovalRequestListView,
    ApprovalActionView,
    OpportunityListView,
    OpportunityDetailView,
    OpportunityApplyView,
    OpportunityApplicantsView,
    CompanyListView,
    CompanyDetailView,
    PlacementDriveListView,
    PlacementDriveDetailView,
    PlacementDriveEligibilityCheckView,
    PlacementDriveApplyView,
    PlacementDriveApplicationsView,
    PlacementInterviewListView,
    TPOStudentMasterView,
    TPOReportsView,
    AdminAnalyticsView,
    AuditLogListView,
    SystemSettingListView,
    AdminBroadcastNotificationView,
)

urlpatterns = [
    # Core Student & Campus Event Endpoints
    path('events/', EventListView.as_view(), name='event-list'),
    path('events/my/', MyEventsView.as_view(), name='my-events'),
    path('events/<int:pk>/', EventDetailView.as_view(), name='event-detail'),
    path('events/<int:pk>/rsvp/', EventRSVPView.as_view(), name='event-rsvp'),
    path('events/<int:pk>/attendees/', EventAttendeesView.as_view(), name='event-attendees'),

    # Club Endpoints
    path('clubs/', ClubListView.as_view(), name='club-list'),
    path('clubs/my/', MyClubsView.as_view(), name='my-clubs'),
    path('clubs/<str:pk>/', ClubDetailView.as_view(), name='club-detail'),
    path('clubs/<str:pk>/join/', ClubJoinView.as_view(), name='club-join'),
    path('clubs/<str:pk>/leave/', ClubLeaveView.as_view(), name='club-leave'),
    path('clubs/<str:pk>/membership/apply/', ClubJoinView.as_view(), name='club-apply'),
    path('clubs/<str:pk>/members/', ClubMembersView.as_view(), name='club-members'),
    path('clubs/<str:pk>/membership/<int:membership_id>/approve/', ClubMembershipApproveView.as_view(), name='club-membership-approve'),
    path('clubs/<str:pk>/membership/<int:membership_id>/reject/', ClubMembershipRejectView.as_view(), name='club-membership-reject'),

    # Club Community Posts Endpoints
    path('clubs/<str:pk>/posts/', ClubPostListCreateView.as_view(), name='club-posts'),
    path('clubs/<str:pk>/posts/<int:post_id>/', ClubPostDetailView.as_view(), name='club-post-detail'),

    # Announcement Endpoints
    path('announcements/', AnnouncementListView.as_view(), name='announcement-list'),
    path('announcements/<int:pk>/', AnnouncementDetailView.as_view(), name='announcement-detail'),

    # Notification Endpoints
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/unread-count/', NotificationUnreadCountView.as_view(), name='notification-unread-count'),
    path('notifications/<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('notifications/read-all/', NotificationMarkAllReadView.as_view(), name='notification-read-all'),
    path('notifications/<int:pk>/', NotificationDeleteView.as_view(), name='notification-delete'),
    path('notifications/preferences/', NotificationPreferenceView.as_view(), name='notification-preferences'),
    path('notifications/broadcast/', AdminBroadcastNotificationView.as_view(), name='notification-broadcast'),

    # Club Real-Time Chat messages
    path('clubs/<str:pk_or_slug>/messages/', ClubMessageListView.as_view(), name='club-messages'),

    # Event Q&A Endpoints
    path('events/<int:event_id>/questions/', EventQuestionListCreateView.as_view(), name='event-questions'),
    path('events/questions/<int:question_id>/answers/', EventQuestionAnswerView.as_view(), name='event-question-answers'),
    path('events/questions/<int:question_id>/upvote/', EventQuestionUpvoteView.as_view(), name='event-question-upvote'),

    # Event Tickets, Attendance & Check-In
    path('tickets/', EventTicketListView.as_view(), name='ticket-list'),
    path('tickets/<str:code_or_id>/', EventTicketDetailView.as_view(), name='ticket-detail'),
    path('events/<int:event_id>/check-in/', EventCheckInView.as_view(), name='event-check-in'),
    path('events/<int:event_id>/attendance/', EventAttendanceView.as_view(), name='event-attendance'),
    path('events/<int:event_id>/attendance/manual/', EventAttendanceManualView.as_view(), name='event-attendance-manual'),
    path('events/<int:event_id>/attendance/export/', EventAttendanceExportView.as_view(), name='event-attendance-export'),

    # =========================================================================
    # Institutional KPRIT Administration Endpoints
    # =========================================================================

    # Academic Departments
    path('departments/', DepartmentListView.as_view(), name='department-list'),
    path('departments/<int:pk>/', DepartmentDetailView.as_view(), name='department-detail'),

    # Unified Approval Center
    path('approvals/', ApprovalRequestListView.as_view(), name='approval-list'),
    path('approvals/<int:pk>/action/', ApprovalActionView.as_view(), name='approval-action'),

    # Opportunities (Internships, Hackathons, Scholarships)
    path('opportunities/', OpportunityListView.as_view(), name='opportunity-list'),
    path('opportunities/<int:pk>/', OpportunityDetailView.as_view(), name='opportunity-detail'),
    path('opportunities/<int:pk>/apply/', OpportunityApplyView.as_view(), name='opportunity-apply'),
    path('opportunities/<int:pk>/applicants/', OpportunityApplicantsView.as_view(), name='opportunity-applicants'),

    # Training & Placement Office (TPO) Endpoints
    path('companies/', CompanyListView.as_view(), name='company-list'),
    path('companies/<int:pk>/', CompanyDetailView.as_view(), name='company-detail'),
    path('placements/drives/', PlacementDriveListView.as_view(), name='placement-drive-list'),
    path('placements/drives/<int:pk>/', PlacementDriveDetailView.as_view(), name='placement-drive-detail'),
    path('placements/drives/<int:pk>/eligibility/', PlacementDriveEligibilityCheckView.as_view(), name='placement-drive-eligibility'),
    path('placements/drives/<int:pk>/apply/', PlacementDriveApplyView.as_view(), name='placement-drive-apply'),
    path('placements/drives/<int:pk>/applications/', PlacementDriveApplicationsView.as_view(), name='placement-drive-applications'),
    path('placements/interviews/', PlacementInterviewListView.as_view(), name='placement-interview-list'),
    path('placements/students/', TPOStudentMasterView.as_view(), name='placement-students-master'),
    path('placements/reports/', TPOReportsView.as_view(), name='placement-reports'),

    # Analytics, Audit & Settings
    path('analytics/admin/', AdminAnalyticsView.as_view(), name='admin-analytics'),
    path('audit-logs/', AuditLogListView.as_view(), name='audit-logs-list'),
    path('settings/system/', SystemSettingListView.as_view(), name='system-settings-list'),
]
