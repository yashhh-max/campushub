"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Tag,
  Edit,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  UserCheck,
  QrCode,
  Users,
  Ticket,
  ArrowRight,
} from "lucide-react";
import { EventItem, EventAttendeesResponse } from "@/types/campus";
import { fetchEventById, fetchEventAttendees } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { RSVPButton } from "@/components/events/RSVPButton";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { EventQASection } from "@/components/events/EventQASection";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const { user, tokens } = useAuth();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [attendeeData, setAttendeeData] = useState<EventAttendeesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await fetchEventById(eventId, tokens?.access);
        if (ignore) return;
        setEvent(data);

        // If user is organizer or admin, load attendee roster
        if (tokens && (data.is_organizer || user?.role === "admin" || user?.is_staff)) {
          try {
            const attendees = await fetchEventAttendees(eventId, tokens.access);
            if (!ignore) {
              setAttendeeData(attendees);
            }
          } catch {
            // Non-blocking if attendee list fails
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Event not found.");
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
  }, [eventId, tokens, user]);

  const handleRsvpChange = (
    newStatus: "attending" | "waitlist" | "cancelled",
    pos?: number
  ) => {
    if (!event) return;
    const isNowAttending = newStatus === "attending";
    const isNowWaitlist = newStatus === "waitlist";
    const wasAttending = event.user_rsvp_status === "attending";

    const updatedCount = isNowAttending
      ? wasAttending ? event.attendee_count : event.attendee_count + 1
      : wasAttending ? Math.max(0, event.attendee_count - 1) : event.attendee_count;

    setEvent({
      ...event,
      user_rsvp_status: newStatus,
      user_waitlist_position: isNowWaitlist ? (pos || 1) : null,
      attendee_count: updatedCount,
      rsvp_count: updatedCount,
      available_seats: Math.max(0, event.capacity - updatedCount),
      is_full: updatedCount >= event.capacity,
    });
  };

  const formatEventTimes = (sStr: string, eStr: string) => {
    try {
      const s = new Date(sStr);
      const e = new Date(eStr);
      const sFormatted = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const eFormatted = e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `${sFormatted} - ${eFormatted}`;
    } catch {
      return "See details";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-16 px-4 max-w-4xl mx-auto animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen py-20 px-4 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Event Not Found
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          {error || "The event you are looking for does not exist or has been removed."}
        </p>
        <div className="mt-6">
          <Link href="/events">
            <Button variant="outline" size="md">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Events
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isRegistered = event.user_rsvp_status === "attending";
  const percentFilled = Math.min(
    100,
    Math.round((event.attendee_count / (event.capacity || 1)) * 100)
  );

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Events</span>
        </Link>

        {event.is_organizer && (
          <div className="flex items-center gap-2">
            <Link id="event-checkin-link" href={`/events/${event.id}/check-in`}>
              <Button variant="primary" size="sm" className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-sm shadow-emerald-600/20">
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Check-In</span>
              </Button>
            </Link>
            <Link id="event-attendance-link" href={`/events/${event.id}/attendance`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Attendance</span>
              </Button>
            </Link>
            <Link href={`/events/${event.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Main Event Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg shadow-slate-200/40 dark:shadow-none">
        {/* Banner Hero */}
        <div
          className={`h-48 sm:h-64 bg-gradient-to-tr ${event.image_gradient || "from-indigo-600 to-blue-700"} p-6 sm:p-8 flex flex-col justify-between text-white relative`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 z-10">
            <Badge variant="tech" className="bg-white/20 text-white border-white/30 backdrop-blur-md">
              {event.category}
            </Badge>

            {isRegistered && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500 text-white shadow-sm">
                <CheckCircle className="w-3.5 h-3.5" />
                You are registered for this event
              </span>
            )}
          </div>

          <div className="z-10">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {event.title}
            </h1>
            {event.club && (
              <p className="mt-1 text-sm text-indigo-100 font-medium">
                Hosted by {event.club.name}
              </p>
            )}
          </div>
        </div>

        {/* Event Body */}
        <div className="p-6 sm:p-10 space-y-8">
          {/* Timing, Venue, and RSVP Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Date
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatDate(event.start_time)}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Time
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatEventTimes(event.start_time, event.end_time)}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Location
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {event.location}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              About This Event
            </h2>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Event Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <Tag className="w-3 h-3 text-slate-400" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Capacity Progress & Interactive RSVP Section */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {event.available_seats} Seats Available
                  </span>
                  {event.is_full && (
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 rounded">
                      Event Full
                    </span>
                  )}
                  {event.has_started && (
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded">
                      Started
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {event.attendee_count} out of {event.capacity} total seats reserved
                </p>
              </div>

              {/* Stateful RSVP Button */}
              <RSVPButton
                eventId={event.id}
                isRegistered={event.user_rsvp_status === "attending"}
                status={event.user_rsvp_status}
                waitlistPosition={event.user_waitlist_position}
                isFull={event.is_full}
                hasStarted={event.has_started}
                onStatusChange={handleRsvpChange}
                size="lg"
              />
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  event.is_full ? "bg-rose-500" : "bg-indigo-600"
                }`}
                style={{ width: `${percentFilled}%` }}
              />
            </div>
          </div>

          {/* Digital Ticket Pass Alert Banner (when registered) */}
          {isRegistered && (
            <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white block">
                    You have an active admission ticket
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Present your digital QR code at entrance for fast mobile check-in.
                  </span>
                </div>
              </div>
              <Link href="/dashboard/tickets">
                <Button variant="outline" size="sm" className="text-xs gap-1.5 shrink-0">
                  <span>Open Ticket</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          )}

          {/* Organizer Attendee Roster (Shown only to event owner/admin) */}
          {event.is_organizer && attendeeData && (
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-500" />
                    <span>Organizer Attendee Roster</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Confidential roster visible only to you and administrators.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {attendeeData.attendees.length} Attendees
                </span>
              </div>

              {attendeeData.attendees.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No registrations yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-850">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Name</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Email</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Student ID</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Department</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">RSVP Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {attendeeData.attendees.map((att) => (
                        <tr key={att.id}>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{att.full_name || "Student"}</td>
                          <td className="px-4 py-3 text-slate-500">{att.email}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono">{att.student_id || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{att.department || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{formatDate(att.rsvp_time)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Real-Time Event Q&A Section */}
          <EventQASection
            eventId={event.id}
            isOrganizer={!!event.is_organizer}
            token={tokens?.access || null}
          />
        </div>
      </div>
    </div>
  );
}
