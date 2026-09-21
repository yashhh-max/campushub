"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Calendar,
  Users,
  Bell,
  Ticket,
  Menu,
  X,
  ArrowRight,
  LogOut,
  Check,
  CheckCheck,
  Sparkles,
  MessageSquare,
  AlertCircle,
  Settings,
  ShieldAlert,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import {
  fetchUnreadNotificationCount,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api";
import { NotificationItem } from "@/types/campus";
import { CampusWebSocketClient } from "@/lib/websocket";

const NAV_ITEMS = [
  { label: "Events", href: "/events", icon: Calendar },
  { label: "Clubs", href: "/clubs", icon: Users },
  { label: "Tickets", href: "/dashboard/tickets", icon: Ticket },
  { label: "Dashboard", href: "/dashboard", icon: Sparkles },
  { label: "Announcements", href: "/#announcements", icon: Bell },
];

export function Navbar() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, token, isAuthenticated, logout } = useAuth();

  const isOrganizer =
    isAuthenticated &&
    (user?.role === "club_leader" || user?.role === "admin" || user?.is_staff);

  const isAdmin =
    isAuthenticated &&
    (user?.role === "admin" || user?.is_staff);

  // Load recent notifications for dropdown
  const loadRecentNotifications = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    setLoadingNotifs(true);
    try {
      const res = await fetchNotifications(token, { page: 1 });
      setRecentNotifications(res.results ? res.results.slice(0, 5) : []);
    } catch {
      setRecentNotifications([]);
    } finally {
      setLoadingNotifs(false);
    }
  }, [isAuthenticated, token]);

  // Real-time Notification WebSocket + periodic fallback
  useEffect(() => {
    let active = true;
    if (isAuthenticated && token) {
      // 1. Initial count fetch
      fetchUnreadNotificationCount(token).then((count) => {
        if (active) setUnreadCount(count);
      });

      // 2. Connect to real-time notification WebSocket
      const wsClient = new CampusWebSocketClient({
        path: "/ws/notifications/",
        token,
        onMessage: (data) => {
          if (!active) return;
          if (data.type === "notification") {
            if (typeof data.unread_count === "number") {
              setUnreadCount(data.unread_count);
            } else {
              setUnreadCount((prev) => prev + 1);
            }
            if (data.notification) {
              setRecentNotifications((prev) => {
                if (prev.some((n) => n.id === data.notification.id)) {
                  return prev;
                }
                return [data.notification, ...prev.slice(0, 4)];
              });
            }
          }
        },
      });
      wsClient.connect();

      // 3. Fallback poll every 30 seconds
      const interval = setInterval(() => {
        fetchUnreadNotificationCount(token).then((count) => {
          if (active) setUnreadCount(count);
        });
      }, 30000);

      return () => {
        active = false;
        clearInterval(interval);
        wsClient.disconnect();
      };
    }
  }, [isAuthenticated, token]);



  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkOneRead = async (notif: NotificationItem) => {
    if (!token) return;
    if (!notif.is_read) {
      try {
        await markNotificationRead(notif.id, token);
        setRecentNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // ignore
      }
    }
    setNotifDropdownOpen(false);
    if (notif.link_url) {
      router.push(notif.link_url);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
      setRecentNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch {
      // ignore
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

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "announcement":
        return <Bell className="w-4 h-4 text-amber-500" />;
      case "event_reminder":
      case "event_rsvp":
        return <Calendar className="w-4 h-4 text-indigo-500" />;
      case "waitlist_promotion":
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      case "club_application_approved":
        return <Check className="w-4 h-4 text-emerald-500" />;
      case "club_application_rejected":
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case "club_post":
      case "club_application":
        return <Users className="w-4 h-4 text-blue-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              CampusHub
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Phase 6
              </span>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              State University Portal
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all duration-150"
              >
                <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500" />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin/announcements"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all ml-1"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </Link>
          )}
        </nav>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 pl-1">
              {/* Notification Bell Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  id="notification-bell-button"
                  type="button"
                  onClick={() => {
                    const next = !notifDropdownOpen;
                    setNotifDropdownOpen(next);
                    if (next) loadRecentNotifications();
                  }}
                  className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
                  aria-label="Notification Center"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span
                      id="notification-unread-badge"
                      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Flyout Panel */}
                {notifDropdownOpen && (
                  <div
                    id="notification-dropdown"
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
                  >
                    {/* Header */}
                    <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Notifications
                        </span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          id="mark-all-read-btn"
                          type="button"
                          onClick={handleMarkAllRead}
                          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                      {loadingNotifs ? (
                        <div className="p-8 text-center text-xs text-slate-400">
                          Loading alerts...
                        </div>
                      ) : recentNotifications.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                          <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            You&apos;re all caught up! No notifications.
                          </p>
                        </div>
                      ) : (
                        recentNotifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleMarkOneRead(n)}
                            className={`p-3 text-left flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                              !n.is_read
                                ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                                : ""
                            }`}
                          >
                            <div className="mt-0.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                              {getNotifIcon(n.notification_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {n.title}
                                </span>
                                {!n.is_read && (
                                  <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                {n.message}
                              </p>
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span>{formatRelativeTime(n.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <Link
                        id="view-all-notifications-link"
                        href="/notifications"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>View all notifications</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>

                      <Link
                        href="/dashboard/settings/notifications"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1"
                        title="Notification Preferences"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar and Profile Menu */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 text-xs hover:border-indigo-400 dark:hover:border-indigo-700 transition-colors"
                title="View Student Command Center"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-slate-900 dark:text-white leading-tight">
                    {user.full_name || user.email.split("@")[0]}
                  </span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono capitalize">
                    {user.role === "club_leader" ? "Club Leader" : user.role}
                  </span>
                </div>
              </Link>

              {isOrganizer && (
                <div className="flex items-center gap-1.5">
                  <Link href="/clubs/create">
                    <Button variant="outline" size="sm" className="text-xs">
                      + Club
                    </Button>
                  </Link>
                  <Link href="/events/create">
                    <Button variant="outline" size="sm" className="text-xs">
                      + Event
                    </Button>
                  </Link>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-xs text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 mr-1" />
                <span>Sign Out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm" className="group">
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Menu */}
        <div className="flex sm:hidden items-center gap-2">
          {isAuthenticated && (
            <Link
              href="/notifications"
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Icon className="w-4 h-4 text-indigo-500" />
                  {item.label}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin/announcements"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Admin Announcements
              </Link>
            )}
          </nav>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                      {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {user.full_name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-indigo-600 font-semibold">Dashboard &rarr;</span>
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/notifications"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs text-center py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
                  </Link>
                  <Link
                    href="/dashboard/settings/notifications"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs text-center py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    Preferences
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/dashboard/clubs"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs text-center py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    My Clubs
                  </Link>
                  <Link
                    href="/dashboard/events"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs text-center py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    My Events
                  </Link>
                </div>

                {isOrganizer && (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/clubs/create"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full"
                    >
                      <Button variant="outline" size="sm" className="w-full justify-center text-xs">
                        + New Club
                      </Button>
                    </Link>
                    <Link
                      href="/events/create"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full"
                    >
                      <Button variant="outline" size="sm" className="w-full justify-center text-xs">
                        + Host Event
                      </Button>
                    </Link>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="md"
                  className="w-full justify-center text-rose-600 dark:text-rose-400"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full"
                >
                  <Button variant="outline" size="md" className="w-full justify-center">
                    Sign In
                  </Button>
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full"
                >
                  <Button variant="primary" size="md" className="w-full justify-center">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
