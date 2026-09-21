"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  Users,
  Clock,
  Sparkles,
  AlertCircle,
  ChevronRight,
  Settings,
  Ticket,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import {
  fetchMyEvents,
  fetchMyClubs,
  fetchAnnouncements,
  fetchUnreadNotificationCount,
} from "@/lib/api";
import {
  MyEventRegistration,
  MyClubsResponse,
  AnnouncementItem,
} from "@/types/campus";

export default function StudentDashboardPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [myEvents, setMyEvents] = useState<MyEventRegistration[]>([]);
  const [myClubs, setMyClubs] = useState<MyClubsResponse>({
    joined_clubs: [],
    pending_applications: [],
    led_clubs: [],
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!token) return;
      setLoading(true);
      try {
        const [count, annoList, eventsList, clubsData] = await Promise.all([
          fetchUnreadNotificationCount(token).catch(() => 0),
          fetchAnnouncements({ token }).catch(() => []),
          fetchMyEvents(token, "upcoming").catch(() => []),
          fetchMyClubs(token).catch(() => ({
            joined_clubs: [],
            pending_applications: [],
            led_clubs: [],
          })),
        ]);

        setUnreadCount(count);
        setAnnouncements(annoList.slice(0, 4));
        setMyEvents(eventsList);
        setMyClubs(clubsData);
      } catch {
        // ignore errors
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated && token) {
      loadDashboardData();
    }
  }, [isAuthenticated, token]);

  const attendingEvents = myEvents.filter((r) => r.status === "attending");
  const waitlistedEvents = myEvents.filter((r) => r.status === "waitlist");
  const urgentAnnouncement = announcements.find((a) => a.priority === "urgent");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-indigo-200 border border-white/15">
                  State University Student Portal
                </span>
                {unreadCount > 0 && (
                  <Link
                    href="/notifications"
                    className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white flex items-center gap-1 shadow-md hover:bg-rose-600 transition-colors"
                  >
                    <Bell className="w-3 h-3" />
                    <span>{unreadCount} Unread Alert{unreadCount > 1 ? "s" : ""}</span>
                  </Link>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Welcome back, {user?.full_name || user?.email.split("@")[0]}!
              </h1>
              <p className="text-xs sm:text-sm text-indigo-200 max-w-xl">
                Track your active club memberships, upcoming events, waitlist status, and official campus announcements.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link href="/notifications">
                <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs">
                  <Bell className="w-3.5 h-3.5 mr-1" />
                  Notifications
                </Button>
              </Link>
              <Link href="/dashboard/settings/notifications">
                <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs">
                  <Settings className="w-3.5 h-3.5 mr-1" />
                  Alert Settings
                </Button>
              </Link>
            </div>
          </div>

          {/* Sub-nav tabs */}
          <div className="mt-8 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 rounded-xl bg-white text-indigo-950 shadow-sm"
            >
              Overview
            </Link>
            <Link
              href="/dashboard/clubs"
              className="px-3.5 py-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              My Clubs ({myClubs.joined_clubs.length})
            </Link>
            <Link
              href="/dashboard/events"
              className="px-3.5 py-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              My Events ({attendingEvents.length})
            </Link>
            <Link
              id="dashboard-subnav-tickets"
              href="/dashboard/tickets"
              className="px-3.5 py-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Digital Passes</span>
            </Link>
            <Link
              href="/notifications"
              className="px-3.5 py-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              Alerts & Notifications
            </Link>
          </div>
        </div>

        {/* Urgent Announcement Alert Banner (if any) */}
        {urgentAnnouncement && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 flex items-start gap-3 shadow-sm animate-in fade-in-50">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-rose-600 text-white">
                  URGENT ADVISORY
                </span>
                <span className="font-bold text-sm text-rose-900 dark:text-rose-100">
                  {urgentAnnouncement.title}
                </span>
              </div>
              <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 line-clamp-2">
                {urgentAnnouncement.content}
              </p>
            </div>
          </div>
        )}

        {/* Bento Grid: 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Unread Notifications */}
          <Link
            id="kpi-notifications-card"
            href="/notifications"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Unread Alerts
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                <Bell className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {loading ? "..." : unreadCount}
              </span>
              <span className="text-xs text-slate-400">new messages</span>
            </div>
            <span className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>View alerts</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          {/* Card 2: Registered Events */}
          <Link
            id="kpi-events-card"
            href="/dashboard/events"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Attending Events
              </span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {loading ? "..." : attendingEvents.length}
              </span>
              <span className="text-xs text-slate-400">confirmed seats</span>
            </div>
            <span className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>View itinerary</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          {/* Card 3: Joined Clubs */}
          <Link
            id="kpi-clubs-card"
            href="/dashboard/clubs"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Joined Clubs
              </span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {loading ? "..." : myClubs.joined_clubs.length}
              </span>
              <span className="text-xs text-slate-400">organizations</span>
            </div>
            <span className="mt-3 text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>My organizations</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          {/* Card 4: Waitlist Queue */}
          <Link
            id="kpi-waitlist-card"
            href="/dashboard/events"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Waitlist Positions
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {loading ? "..." : waitlistedEvents.length}
              </span>
              <span className="text-xs text-slate-400">queued events</span>
            </div>
            <span className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Check queue status</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {/* Two-Column Section: Latest Announcements & Upcoming Itinerary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Column 1: Targeted Announcements */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Campus Announcements
                </h2>
              </div>
              <Link
                href="/#announcements"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View all announcements &rarr;
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                No active announcements for your department right now.
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                            a.priority === "urgent"
                              ? "bg-rose-100 text-rose-700 border-rose-200"
                              : a.priority === "official"
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {a.priority}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          {a.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {a.published_at || a.publishedAt || a.created_at
                          ? new Date(a.published_at || a.publishedAt || a.created_at || "").toLocaleDateString()
                          : "Recent"}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {a.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {a.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Upcoming Events & Pending Applications */}
          <div className="space-y-6">
            {/* Upcoming Registered Events */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Your Upcoming Events
                  </h2>
                </div>
                <Link
                  href="/events"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Browse events &rarr;
                </Link>
              </div>

              {attendingEvents.length === 0 ? (
                <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500">No upcoming events registered.</p>
                  <Link href="/events">
                    <Button size="sm" variant="outline" className="text-xs mt-1">
                      Explore Campus Events
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {attendingEvents.slice(0, 3).map((r) => (
                    <Link
                      key={r.rsvp_id}
                      href={`/events/${r.event.id}`}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 hover:border-indigo-400 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                          {r.event.category}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {r.event.title}
                        </h4>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(r.event.start_time).toLocaleDateString()}
                          </span>
                          <span>• {r.event.location}</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                        Attending ✓
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Club Applications & Waitlist Spot */}
            {(myClubs.pending_applications.length > 0 || waitlistedEvents.length > 0) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                    Pending Applications & Queue Status
                  </h2>
                </div>

                <div className="space-y-2.5">
                  {myClubs.pending_applications.map((app) => (
                    <div
                      key={app.membership_id}
                      className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {app.club.name} Membership Application
                        </span>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          Under leadership review
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                        Pending
                      </span>
                    </div>
                  ))}

                  {waitlistedEvents.map((r) => (
                    <div
                      key={r.rsvp_id}
                      className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Waitlisted: {r.event.title}
                        </span>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Automated promotion enabled if seats open
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100">
                        Waitlist Queue
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
