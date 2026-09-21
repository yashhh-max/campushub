"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Eye,
  CheckCircle,
  Tag,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { SAMPLE_EVENTS } from "@/data/sampleData";
import { EventItem, EventCategory } from "@/types/campus";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";

const CATEGORIES: Array<"All" | EventCategory> = [
  "All",
  "Tech",
  "Career",
  "Arts",
  "Social",
  "Academic",
];

export function EventsPreview() {
  const [selectedCategory, setSelectedCategory] = useState<"All" | EventCategory>("All");
  const [activeModalEvent, setActiveModalEvent] = useState<EventItem | null>(null);
  const [rsvpdEvents, setRsvpdEvents] = useState<Record<string | number, boolean>>({});

  const filteredEvents =
    selectedCategory === "All"
      ? SAMPLE_EVENTS
      : SAMPLE_EVENTS.filter((e) => e.category === selectedCategory);

  const toggleRsvp = (eventId: string | number) => {
    setRsvpdEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  return (
    <section id="events" className="py-16 md:py-24 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              DEMO DATA PREVIEW
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Upcoming Campus Events
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Interactive preview of upcoming lectures, hackathons, job fairs, and social gatherings.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              No events found in this category
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Select &quot;All&quot; to preview all collegiate demo events.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const isRsvpd = !!rsvpdEvents[event.id];
              const displayRsvpCount =
                (event.rsvpCount ?? event.rsvp_count ?? 0) + (isRsvpd ? 1 : 0);
              const fillPercentage = Math.min(
                100,
                Math.round((displayRsvpCount / event.capacity) * 100)
              );
              const organizerName =
                typeof event.organizer === "object" && event.organizer
                  ? event.organizer.full_name
                  : String(event.organizer || "Student Club");

              return (
                <Card
                  key={event.id}
                  className="flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all"
                >
                  {/* Card Visual Header */}
                  <div
                    className={`h-28 bg-gradient-to-tr ${event.imageGradient || event.image_gradient || "from-indigo-600 to-blue-700"} p-4 flex flex-col justify-between text-white relative overflow-hidden`}
                  >
                    <div className="flex items-center justify-between z-10">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
                        {event.category}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-black/30 backdrop-blur-md">
                        Demo
                      </span>
                    </div>
                    <div className="z-10 flex items-center gap-1.5 text-xs font-medium">
                      <Calendar className="w-3.5 h-3.5 opacity-90" />
                      <span>{formatDate(event.date || event.start_time)}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">
                        {event.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                        {event.description}
                      </p>

                      <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{event.time || "Scheduled Event"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate">Organized by {organizerName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Capacity and Action Footer */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                          <span>Capacity</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {displayRsvpCount} / {event.capacity} RSVPs
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                            style={{ width: `${fillPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setActiveModalEvent(event)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Quick View
                        </Button>
                        <Button
                          variant={isRsvpd ? "secondary" : "primary"}
                          size="sm"
                          className="flex-1"
                          onClick={() => toggleRsvp(event.id)}
                        >
                          {isRsvpd ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mr-1" />
                              RSVPed
                            </>
                          ) : (
                            "RSVP (Demo)"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link href="/events">
            <Button size="lg" className="font-semibold group shadow-md shadow-indigo-500/20">
              <span>View Full Campus Events Catalog & RSVP</span>
              <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick View Interactive Modal */}
      {activeModalEvent && (
        <Modal
          isOpen={!!activeModalEvent}
          onClose={() => setActiveModalEvent(null)}
          title={activeModalEvent.title}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="tech">{activeModalEvent.category}</Badge>
              <Badge variant="muted">
                Organized by{" "}
                {typeof activeModalEvent.organizer === "object" && activeModalEvent.organizer
                  ? activeModalEvent.organizer.full_name
                  : String(activeModalEvent.organizer || "Campus Club")}
              </Badge>
              <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded font-mono">
                [DEMO PREVIEW]
              </span>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {activeModalEvent.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>Date: {formatDate(activeModalEvent.date || activeModalEvent.start_time)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Time: {activeModalEvent.time || "Scheduled Event"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 sm:col-span-2">
                <MapPin className="w-4 h-4 text-indigo-500" />
                <span>Venue: {activeModalEvent.location}</span>
              </div>
            </div>

            {activeModalEvent.tags && activeModalEvent.tags.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeModalEvent.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3 text-slate-400" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                {(activeModalEvent.rsvpCount ?? activeModalEvent.rsvp_count ?? 0) +
                  (rsvpdEvents[activeModalEvent.id] ? 1 : 0)}{" "}
                students attending
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveModalEvent(null)}
                >
                  Close
                </Button>
                <Button
                  variant={rsvpdEvents[activeModalEvent.id] ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => toggleRsvp(activeModalEvent.id)}
                >
                  {rsvpdEvents[activeModalEvent.id] ? "Cancel RSVP" : "Confirm RSVP (Demo)"}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
