"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Ticket,
  CalendarCheck,
  History,
  Building2,
} from "lucide-react";
import { MyEventRegistration } from "@/types/campus";
import { fetchMyEvents, cancelEventRsvp, rsvpEvent } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

type TabType = "all" | "upcoming" | "past";

export default function MyEventsDashboardPage() {
  const { user, tokens, isAuthenticated, isLoading: authLoading } = useAuth();

  const [registrations, setRegistrations] = useState<MyEventRegistration[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const reloadRegistrations = async () => {
    if (!tokens) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMyEvents(
        tokens.access,
        activeTab === "all" ? undefined : activeTab
      );
      setRegistrations(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load registrations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    if (!isAuthenticated || !tokens) {
      return;
    }

    async function load() {
      try {
        const data = await fetchMyEvents(
          tokens!.access,
          activeTab === "all" ? undefined : activeTab
        );
        if (!ignore) {
          setRegistrations(data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load registrations.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, tokens, activeTab]);

  const handleCancelRsvp = async (eventId: number) => {
    if (!tokens) return;
    setCancellingId(eventId);
    try {
      await cancelEventRsvp(eventId, tokens.access);
      // Refresh registrations
      await reloadRegistrations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel RSVP.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleReRsvp = async (eventId: number) => {
    if (!tokens) return;
    setCancellingId(eventId);
    try {
      await rsvpEvent(eventId, tokens.access);
      await reloadRegistrations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to re-register for event.");
    } finally {
      setCancellingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen py-12 px-4 max-w-6xl mx-auto">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-16 px-4 max-w-xl mx-auto text-center">
        <div className="p-8 sm:p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-none">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-5">
            <Ticket className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Student Dashboard
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Log in with your university account to access your event registrations, ticket passes, and campus activity.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login?redirect=/dashboard/events" className="w-full sm:w-auto">
              <Button size="lg" className="w-full font-semibold">
                Sign In to CampusHub
              </Button>
            </Link>
            <Link href="/events" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full">
                Browse Events
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeRegistrations = registrations.filter((r) => r.status === "attending");
  const cancelledRegistrations = registrations.filter((r) => r.status === "cancelled");

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Top Header Banner */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                Student Portal
              </span>
              <span className="text-xs text-slate-500">
                {user?.profile?.department || "CampusHub University"}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              My Campus Events
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Welcome back, {user?.full_name || user?.email.split("@")[0]}! Track and manage all your event registrations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/events">
              <Button variant="outline" size="sm" className="font-medium">
                Browse More Events
              </Button>
            </Link>
            {(user?.role === "club_leader" || user?.role === "admin" || user?.is_staff) && (
              <Link href="/events/create">
                <Button size="sm" className="font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Host Event</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {activeRegistrations.length}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Active RSVPs
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {registrations.length}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Total Registered
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {cancelledRegistrations.length}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Cancelled RSVPs
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "upcoming"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          <span>Upcoming Events</span>
        </button>

        <button
          onClick={() => setActiveTab("past")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "past"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Past Events</span>
        </button>

        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === "all"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>All Registrations</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-start gap-3 text-sm text-rose-800 dark:text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 animate-pulse"
            >
              <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : registrations.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No registrations found
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {activeTab === "upcoming"
              ? "You haven't RSVP'd to any upcoming campus events yet."
              : activeTab === "past"
              ? "You don't have any past attended events."
              : "You haven't registered for any events yet."}
          </p>
          <div className="mt-6">
            <Link href="/events">
              <Button size="sm" className="font-medium">
                Explore Campus Events
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map((reg) => {
            const ev = reg.event;
            const isAttending = reg.status === "attending";
            const isCancelled = reg.status === "cancelled";
            const isEventPast = new Date(ev.end_time) < new Date();

            return (
              <div
                key={reg.rsvp_id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="tech" className="text-xs">
                      {ev.category}
                    </Badge>

                    {isAttending && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Registered</span>
                      </span>
                    )}

                    {isCancelled && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        <XCircle className="w-3 h-3 text-slate-400" />
                        <span>Cancelled</span>
                      </span>
                    )}

                    {isEventPast && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Concluded
                      </span>
                    )}
                  </div>

                  <Link href={`/events/${ev.id}`}>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                      {ev.title}
                    </h3>
                  </Link>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{ev.club?.name || ev.club_name || "Student Organization"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{formatDate(ev.start_time)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{ev.location}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <Link href={`/events/${ev.id}`}>
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                  </Link>

                  {isAttending && !isEventPast && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleCancelRsvp(Number(ev.id))}
                      isLoading={cancellingId === Number(ev.id)}
                      disabled={cancellingId !== null}
                    >
                      Cancel RSVP
                    </Button>
                  )}

                  {isCancelled && !isEventPast && (
                    <Button
                      size="sm"
                      onClick={() => handleReRsvp(Number(ev.id))}
                      isLoading={cancellingId === Number(ev.id)}
                      disabled={cancellingId !== null}
                    >
                      Re-Register
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
