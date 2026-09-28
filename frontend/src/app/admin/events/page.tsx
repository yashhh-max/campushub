"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuth } from "@/context/AuthContext";
import { institutionalApi } from "@/lib/institutionalApi";
import {
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  QrCode,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface EventItem {
  id: number;
  title: string;
  category?: string;
  club_name?: string;
  venue?: string;
  event_date: string;
  capacity?: number;
  current_attendees?: number;
  registrations_count?: number;
  institutional_status?: string;
  is_approved?: boolean;
}

export default function AdminEventsPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await institutionalApi.getEvents(token, {
        search: search || undefined,
      });
      let list = Array.isArray(res) ? res : res.results || [];
      if (statusFilter !== "ALL") {
        list = list.filter((e: EventItem) => {
          const status = e.institutional_status || (e.is_approved ? "published" : "pending_approval");
          return status.toLowerCase() === statusFilter.toLowerCase();
        });
      }
      setEvents(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleApproveEvent = async (eventId: number) => {
    if (!token) return;
    try {
      await institutionalApi.approveEvent(token, eventId);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, institutional_status: "approved", is_approved: true }
            : e
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to approve event");
    }
  };

  const handleExportAttendees = async (eventId: number, eventTitle: string) => {
    if (!token) return;
    try {
      const blob = await institutionalApi.exportAttendees(token, eventId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${eventTitle.replace(/[^a-zA-Z0-9]/g, "_")}_Attendees.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to export attendees list");
    }
  };

  const getStatusBadge = (status?: string, isApproved?: boolean) => {
    const s = (status || (isApproved ? "published" : "pending_approval")).toLowerCase();
    switch (s) {
      case "published":
      case "approved":
        return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "pending_approval":
      case "pending":
        return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "draft":
        return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";
      case "completed":
        return "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "cancelled":
        return "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200";
    }
  };

  return (
    <AdminShell requiredPermission="EVENT_EDIT">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Event Management & Lifecycle
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Institutional calendar, approvals, capacity enforcement, QR check-in, and attendee roster exports.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadEvents}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/events/create">
              <Button variant="primary" size="sm" className="flex items-center gap-1.5 text-xs shadow-md shadow-indigo-600/20">
                <Plus className="w-3.5 h-3.5" />
                Host College Event
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by event title, venue, or host club..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="published">Published</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Events Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading campus events...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-500 text-xs font-semibold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                No events match this filter
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No events found matching your search criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">Event Details</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Venue</th>
                    <th className="py-3.5 px-4">Registrations</th>
                    <th className="py-3.5 px-4">Lifecycle Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {events.map((event) => {
                    const status =
                      event.institutional_status || (event.is_approved ? "published" : "pending_approval");
                    const count = event.registrations_count || event.current_attendees || 0;
                    return (
                      <tr
                        key={event.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white text-sm">
                            {event.title}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-medium text-indigo-600 dark:text-indigo-400">
                              {event.club_name || "Institution"}
                            </span>
                            {event.category && <span>• {event.category}</span>}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 dark:text-slate-200 font-medium">
                            {new Date(event.event_date).toLocaleDateString()}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(event.event_date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{event.venue || "Campus Auditorium"}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{count}</span>
                            {event.capacity && (
                              <span className="text-[11px] text-slate-400 font-normal">
                                / {event.capacity}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                              status,
                              event.is_approved
                            )}`}
                          >
                            {status.replace(/_/g, " ")}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {status.includes("pending") && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleApproveEvent(event.id)}
                                className="text-[11px] py-1 px-2.5 h-auto"
                              >
                                Approve
                              </Button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleExportAttendees(event.id, event.title)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Export Attendees CSV"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <Link
                              href={`/events/${event.id}`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="View Event"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
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
    </AdminShell>
  );
}
