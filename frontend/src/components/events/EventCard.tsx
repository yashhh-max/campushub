"use client";

import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { EventItem } from "@/types/campus";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

export function EventCard({ event }: { event: EventItem }) {
  const percentFilled = Math.min(
    100,
    Math.round((event.attendee_count / (event.capacity || 1)) * 100)
  );

  const formatEventTime = (startTimeStr: string, endTimeStr: string) => {
    try {
      const s = new Date(startTimeStr);
      const e = new Date(endTimeStr);
      const sFormatted = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const eFormatted = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${sFormatted} - ${eFormatted}`;
    } catch {
      return "See schedule";
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all group">
      {/* Card Gradient Header */}
      <div
        className={`h-28 bg-gradient-to-tr ${event.image_gradient || "from-indigo-600 to-blue-700"} p-4 flex flex-col justify-between text-white relative overflow-hidden`}
      >
        <div className="flex items-center justify-between z-10">
          <Badge variant="tech" className="bg-white/20 text-white border-white/30 backdrop-blur-md">
            {event.category}
          </Badge>

          {event.user_rsvp_status === "attending" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
              <CheckCircle className="w-3 h-3" />
              Registered
            </span>
          )}

          {event.is_full && event.user_rsvp_status !== "attending" && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-600/90 text-white backdrop-blur-md">
              Full
            </span>
          )}
        </div>

        <div className="z-10 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 opacity-90" />
            <span>{formatDate(event.start_time)}</span>
          </div>
          {event.club_name && (
            <span className="text-[11px] font-medium opacity-90 truncate max-w-[140px]">
              {event.club_name}
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <Link href={`/events/${event.id}`}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {event.title}
            </h3>
          </Link>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
            {event.description}
          </p>

          <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{formatEventTime(event.start_time, event.end_time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
            {event.organizer && (
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">
                  Host:{" "}
                  {typeof event.organizer === "object" && event.organizer
                    ? event.organizer.full_name
                    : String(event.organizer)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Capacity Bar & Action */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div>
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span>
                {event.is_full ? (
                  <span className="text-rose-500 font-semibold">At capacity</span>
                ) : (
                  <span>
                    <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">
                      {event.available_seats}
                    </strong>{" "}
                    seats left
                  </span>
                )}
              </span>
              <span>
                {event.attendee_count} / {event.capacity} RSVPs
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  event.is_full ? "bg-rose-500" : "bg-indigo-600"
                }`}
                style={{ width: `${percentFilled}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 font-mono">
              {event.has_started ? "Event Started" : "Upcoming"}
            </span>

            <Link
              href={`/events/${event.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 group/link"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
