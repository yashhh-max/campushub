"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  Users,
  Sparkles,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  MessageSquare,
  Clock,
  ChevronRight,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/lib/api";
import { NotificationItem } from "@/types/campus";

type TabFilter = "all" | "unread" | "read";

export default function NotificationsPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshNotifications = useCallback(() => {
    if (!token) return;
    setLoading(true);
    const isReadParam = activeTab === "all" ? undefined : activeTab === "read";
    fetchNotifications(token, { is_read: isReadParam })
      .then((res) => {
        setNotifications(res.results || []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load notifications.");
        setLoading(false);
      });
  }, [token, activeTab]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/notifications");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    let active = true;
    if (isAuthenticated && token) {
      const isReadParam = activeTab === "all" ? undefined : activeTab === "read";
      fetchNotifications(token, { is_read: isReadParam })
        .then((res) => {
          if (active) {
            setNotifications(res.results || []);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (active) {
            setError(err instanceof Error ? err.message : "Failed to load notifications.");
            setLoading(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated, token, activeTab]);


  const handleMarkRead = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!token) return;
    try {
      await markNotificationRead(id, token);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await deleteNotification(id, token);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "announcement":
        return <Bell className="w-5 h-5 text-amber-500" />;
      case "event_reminder":
      case "event_rsvp":
        return <Calendar className="w-5 h-5 text-indigo-500" />;
      case "waitlist_promotion":
        return <Sparkles className="w-5 h-5 text-emerald-500" />;
      case "club_application_approved":
        return <Check className="w-5 h-5 text-emerald-500" />;
      case "club_application_rejected":
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case "club_post":
      case "club_application":
        return <Users className="w-5 h-5 text-blue-500" />;
      default:
        return <MessageSquare className="w-5 h-5 text-slate-500" />;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSec < 60) return "Just now";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <Link
            id="notification-preferences-link"
            href="/dashboard/settings/notifications"
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Notification Center
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Campus-wide announcements, event reminders, and club updates.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                id="mark-all-read-page-btn"
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs flex items-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4 text-indigo-600" />
                <span>Mark all as read</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            id="tab-all"
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            All Alerts
          </button>
          <button
            id="tab-unread"
            type="button"
            onClick={() => setActiveTab("unread")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "unread"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === "unread" ? "bg-white/20 text-white" : "bg-rose-100 dark:bg-rose-950 text-rose-600"
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
          <button
            id="tab-read"
            type="button"
            onClick={() => setActiveTab("read")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "read"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Read
          </button>
        </div>

        {/* Notifications Feed */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="font-bold text-slate-900 dark:text-white">Failed to load alerts</h3>
            <p className="text-xs text-slate-500">{error}</p>
            <Button size="sm" onClick={refreshNotifications}>
              Retry
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {activeTab === "unread" ? "No unread alerts" : "No notifications found"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeTab === "unread"
                ? "You&apos;ve read all your notifications! Check back later for campus updates and event reminders."
                : "When official announcements, RSVP confirmations, or club messages are dispatched, they will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                id={`notification-card-${n.id}`}
                onClick={() => {
                  if (!n.is_read) handleMarkRead(n.id);
                  if (n.link_url) router.push(n.link_url);
                }}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                  !n.is_read
                    ? "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800/80 shadow-md shadow-indigo-500/5"
                    : "bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {/* Type Icon */}
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0">
                  {getNotifIcon(n.notification_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {n.title}
                      </h4>
                      {!n.is_read && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          New
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatRelativeTime(n.created_at)}</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>

                  {/* Actions & Metadata */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      {n.link_url && (
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5">
                          <span>View Details</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!n.is_read && (
                        <button
                          id={`mark-read-btn-${n.id}`}
                          type="button"
                          onClick={(e) => handleMarkRead(n.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        id={`delete-btn-${n.id}`}
                        type="button"
                        onClick={(e) => handleDelete(n.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
