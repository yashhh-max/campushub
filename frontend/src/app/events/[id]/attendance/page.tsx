"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  CheckCircle2,
  Search,
  Download,
  ArrowLeft,
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import {
  fetchEventById,
  fetchEventAttendance,
  manualCheckIn,
  getEventAttendanceExportUrl,
} from "@/lib/api";
import { EventItem, AttendanceStats, AttendeeCheckInRecord } from "@/types/campus";
import { CampusWebSocketClient } from "@/lib/websocket";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EventAttendancePage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const { token, isAuthenticated, isLoading: authLoading } = useAuth();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [attendees, setAttendees] = useState<AttendeeCheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "checked_in" | "not_checked_in">("all");
  const [wsConnected, setWsConnected] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [recentPulse, setRecentPulse] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/events/${eventId}/attendance`);
    }
  }, [authLoading, isAuthenticated, router, eventId]);

  // Load initial data
  useEffect(() => {
    let ignore = false;
    if (!isAuthenticated || !token) return;

    async function load() {
      try {
        const [ev, att] = await Promise.all([
          fetchEventById(eventId, token || undefined),
          fetchEventAttendance(eventId, token || ""),
        ]);
        if (!ignore) {
          setEvent(ev);
          setStats(att);
          setAttendees(att.attendees || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          alert((err as Error).message || "Failed to load attendance dashboard.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [eventId, isAuthenticated, token]);

  const handleRefresh = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [ev, att] = await Promise.all([
        fetchEventById(eventId, token || undefined),
        fetchEventAttendance(eventId, token || ""),
      ]);
      setEvent(ev);
      setStats(att);
      setAttendees(att.attendees || []);
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to reload attendance dashboard.");
    } finally {
      setLoading(false);
    }
  };

  // Connect Real-Time Attendance WebSocket
  useEffect(() => {
    if (!eventId || !token || !isAuthenticated) return;

    const client = new CampusWebSocketClient({
      path: `/ws/events/${eventId}/attendance/`,
      token,
      onOpen: () => {
        setWsConnected(true);
      },
      onClose: () => {
        setWsConnected(false);
      },
      onMessage: (data) => {
        if (data.type === "attendance_update") {
          // Trigger visual counter pulse
          setRecentPulse(true);
          setTimeout(() => setRecentPulse(false), 2000);

          // Update stats
          setStats((prev) => {
            if (!prev) return prev;
            const updatedCheckedIn = typeof data.checked_in_count === "number" ? data.checked_in_count : prev.checked_in_count;
            const updatedRegistered = typeof data.registered_count === "number" ? data.registered_count : prev.registered_count;
            const updatedPercentage = typeof data.checkin_percentage === "number" ? data.checkin_percentage : prev.checkin_percentage;
            return {
              ...prev,
              checked_in_count: updatedCheckedIn,
              registered_count: updatedRegistered,
              checkin_percentage: updatedPercentage,
              no_show_count: Math.max(0, updatedRegistered - updatedCheckedIn),
            };
          });

          // Update attendee record in list
          if (data.attendee) {
            const attData = data.attendee as { id?: number; ticket_code?: string; is_checked_in?: boolean; checked_in_at?: string };
            setAttendees((prev) =>
              prev.map((att) => {
                if (att.id === attData.id || att.ticket_code === attData.ticket_code) {
                  return {
                    ...att,
                    is_checked_in: Boolean(attData.is_checked_in),
                    checked_in_at: attData.checked_in_at || null,
                    ticket_status: attData.is_checked_in ? "checked_in" : "valid",
                  };
                }
                return att;
              })
            );
          }
        }
      },
    });

    client.connect();

    return () => {
      client.disconnect();
    };
  }, [eventId, token, isAuthenticated]);

  // Toggle Manual Check-In
  const handleToggleManual = async (attendee: AttendeeCheckInRecord) => {
    if (!token || processingId) return;
    setProcessingId(attendee.id);
    const targetStatus = !attendee.is_checked_in;

    try {
      const res = await manualCheckIn(eventId, attendee.id, targetStatus, token);
      // Update locally
      setAttendees((prev) =>
        prev.map((a) =>
          a.id === attendee.id
            ? {
                ...a,
                is_checked_in: res.attendee.is_checked_in,
                checked_in_at: res.attendee.checked_in_at,
                ticket_status: res.attendee.is_checked_in ? "checked_in" : "valid",
              }
            : a
        )
      );

      setStats((prev) => {
        if (!prev) return prev;
        const delta = targetStatus ? 1 : -1;
        const updatedCheckedIn = Math.max(0, prev.checked_in_count + delta);
        const pct = prev.registered_count > 0 ? (updatedCheckedIn / prev.registered_count) * 100 : 0;
        return {
          ...prev,
          checked_in_count: updatedCheckedIn,
          checkin_percentage: Math.round(pct * 10) / 10,
          no_show_count: Math.max(0, prev.registered_count - updatedCheckedIn),
        };
      });
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to update attendance status.");
    } finally {
      setProcessingId(null);
    }
  };

  // Filter Attendees
  const filteredAttendees = attendees.filter((a) => {
    if (statusFilter === "checked_in" && !a.is_checked_in) return false;
    if (statusFilter === "not_checked_in" && a.is_checked_in) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = a.full_name?.toLowerCase().includes(q);
      const emailMatch = a.email?.toLowerCase().includes(q);
      const codeMatch = a.ticket_code?.toLowerCase().includes(q);
      const sidMatch = a.student_id?.toLowerCase().includes(q);
      return nameMatch || emailMatch || codeMatch || sidMatch;
    }
    return true;
  });

  const exportUrl = token ? getEventAttendanceExportUrl(eventId, token) : "#";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Event Page</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link id="open-checkin-scanner-btn" href={`/events/${eventId}/check-in`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <QrCode className="w-3.5 h-3.5" />
                <span>Camera Check-In Scanner</span>
              </Button>
            </Link>

            <a
              id="export-attendance-csv-btn"
              href={exportUrl}
              download={`attendance_event_${eventId}.csv`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* Hero Card with Live WebSocket Status */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/50 shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                Executive Attendance Dashboard
              </span>

              {wsConnected ? (
                <span
                  id="attendance-ws-live-badge"
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                >
                  <Wifi className="w-3 h-3 animate-pulse" />
                  <span>Real-Time Stream Active</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline Sync</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {event?.title || "Event Attendance"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Monitor admissions as attendees arrive at the entrance in real time. Numbers update automatically on check-in scan.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* 5-Column Metric Bento Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Capacity */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Venue Capacity
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {stats?.capacity ?? event?.capacity ?? 0}
              </span>
              <span className="text-xs text-slate-400 font-medium">seats</span>
            </div>
          </div>

          {/* Registered Attendees */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Registered RSVPs
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {stats?.registered_count ?? 0}
              </span>
              <span className="text-xs text-slate-400 font-medium">students</span>
            </div>
          </div>

          {/* Checked In (with real-time pulse animation) */}
          <div
            id="kpi-checked-in-card"
            className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm transition-all duration-300 ${
              recentPulse
                ? "border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/30 scale-105"
                : "border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Checked In
              </span>
              {recentPulse && (
                <span className="text-[10px] font-bold text-emerald-600 animate-bounce">
                  +1 Just In
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                id="checked-in-counter-value"
                className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400"
              >
                {stats?.checked_in_count ?? 0}
              </span>
              <span className="text-xs text-slate-400 font-medium">admitted</span>
            </div>
          </div>

          {/* Check-In % */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Turnout Rate
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span
                id="checkin-percentage-value"
                className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400"
              >
                {stats?.checkin_percentage ?? 0}%
              </span>
            </div>
            {/* Tiny progress bar */}
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{ width: `${Math.min(100, stats?.checkin_percentage ?? 0)}%` }}
              />
            </div>
          </div>

          {/* No-Shows / Pending */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 lg:col-span-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Pending / No-Show
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                {stats?.no_show_count ?? 0}
              </span>
              <span className="text-xs text-slate-400 font-medium">expected</span>
            </div>
          </div>
        </div>

        {/* Attendee Roster Section */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Attendee Roster & Manual Check-In</span>
              </h2>
              <p className="text-xs text-slate-500">
                Click the status toggle to manually admit or revoke check-in for individual attendees.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold self-start sm:self-auto">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === "all"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All ({attendees.length})
              </button>
              <button
                onClick={() => setStatusFilter("checked_in")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === "checked_in"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Checked In ({stats?.checked_in_count ?? 0})
              </button>
              <button
                onClick={() => setStatusFilter("not_checked_in")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === "not_checked_in"
                    ? "bg-white dark:bg-slate-900 text-amber-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Pending ({stats?.no_show_count ?? 0})
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, student ID, or ticket code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Table of Attendees */}
          {loading ? (
            <div className="space-y-3 py-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : filteredAttendees.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No attendees found matching current filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-850">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Attendee</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Student ID</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Ticket Code</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">RSVP Date</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredAttendees.map((a) => {
                    const isCheckedIn = a.is_checked_in;
                    const isPending = processingId === a.id;

                    return (
                      <tr key={a.id} id={`attendance-row-${a.id}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {a.full_name || "Student"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {a.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {a.student_id || "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                          {a.ticket_code || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {a.rsvp_time ? new Date(a.rsvp_time).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {isCheckedIn ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Checked In</span>
                              {a.checked_in_at && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({new Date(a.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-600 font-medium">
                              Not Checked In
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            id={`manual-checkin-btn-${a.id}`}
                            variant={isCheckedIn ? "outline" : "primary"}
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleToggleManual(a)}
                            className="text-xs h-8 px-3"
                          >
                            {isPending
                              ? "Updating..."
                              : isCheckedIn
                              ? "Revoke"
                              : "Check In"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
