"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ticket,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  QrCode,
  Sparkles,
  ShieldCheck,
  Maximize2,
  X,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { fetchMyTickets } from "@/lib/api";
import { EventTicket } from "@/types/campus";

export default function MyTicketsPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();

  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<"all" | "valid" | "checked_in" | "cancelled">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModalTicket, setActiveModalTicket] = useState<EventTicket | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/dashboard/tickets");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function loadTickets() {
      if (!token) return;
      setLoading(true);
      try {
        const data = await fetchMyTickets(token);
        setTickets(data);
      } catch {
        setTickets([]);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated && token) {
      loadTickets();
    }
  }, [isAuthenticated, token]);

  const filteredTickets = tickets.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = t.event_title?.toLowerCase().includes(q);
      const codeMatch = t.ticket_code?.toLowerCase().includes(q);
      const locMatch = t.event_location?.toLowerCase().includes(q);
      return titleMatch || codeMatch || locMatch;
    }
    return true;
  });

  const validCount = tickets.filter((t) => t.status === "valid").length;
  const checkedInCount = tickets.filter((t) => t.status === "checked_in").length;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "TBD";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-900/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  CampusHub Pass Wallet
                </span>
                <span className="text-xs text-slate-400">
                  {tickets.length} Total Pass{tickets.length === 1 ? "" : "es"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                My Event Tickets
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Present your digital QR passes at campus venue entrances for fast mobile check-in. Valid passes are cryptographically verifiable.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/events">
                <Button variant="primary" size="sm" className="gap-2 shadow-lg shadow-indigo-600/30">
                  <Sparkles className="w-4 h-4" />
                  <span>Browse Events</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick stats pills */}
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-3 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                filter === "all"
                  ? "bg-white text-slate-900 shadow"
                  : "bg-white/10 text-white/80 hover:bg-white/15"
              }`}
            >
              All Passes ({tickets.length})
            </button>
            <button
              onClick={() => setFilter("valid")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                filter === "valid"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 font-bold"
                  : "bg-white/10 text-emerald-300 hover:bg-white/15"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Valid & Active ({validCount})
            </button>
            <button
              onClick={() => setFilter("checked_in")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                filter === "checked_in"
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/20 font-bold"
                  : "bg-white/10 text-blue-300 hover:bg-white/15"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Checked In ({checkedInCount})
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by event or ticket code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-500">
            <span>Showing {filteredTickets.length} of {tickets.length} passes</span>
          </div>
        </div>

        {/* Ticket List / Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-72 rounded-3xl bg-slate-200 dark:bg-slate-800/50 animate-pulse border border-slate-300/40 dark:border-slate-700/40"
              />
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Ticket className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {filter === "all" ? "No Event Passes Yet" : `No ${filter.replace("_", " ")} passes`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                RSVP to an upcoming campus event to receive an admission ticket and digital QR pass automatically.
              </p>
            </div>
            <Link href="/events">
              <Button variant="outline" size="sm" className="mt-2">
                Explore Upcoming Events &rarr;
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTickets.map((t) => {
              const isValid = t.status === "valid";
              const isCheckedIn = t.status === "checked_in";
              const isCancelled = t.status === "cancelled";

              return (
                <div
                  key={t.id}
                  className={`relative rounded-3xl bg-white dark:bg-slate-900 border shadow-md hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden group ${
                    isCancelled
                      ? "border-slate-200 dark:border-slate-800 opacity-70"
                      : isCheckedIn
                      ? "border-blue-200 dark:border-blue-900/40"
                      : "border-indigo-100 dark:border-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-700"
                  }`}
                >
                  {/* Top Header Card */}
                  <div className="p-5 pb-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-bold">
                          {t.ticket_code}
                        </span>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-2 mt-0.5">
                          {t.event_title}
                        </h3>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${
                          isValid
                            ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : isCheckedIn
                            ? "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                            : "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        }`}
                      >
                        {isValid && <CheckCircle2 className="w-3 h-3" />}
                        {isCheckedIn && <ShieldCheck className="w-3 h-3" />}
                        {isCancelled && <XCircle className="w-3 h-3" />}
                        <span>{isValid ? "Active Pass" : isCheckedIn ? "Checked In" : "Cancelled"}</span>
                      </span>
                    </div>

                    {/* Metadata lines */}
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{formatDate(t.event_start_time)}</span>
                        {t.event_start_time && (
                          <span className="text-slate-400 font-mono text-[11px]">
                            • {formatTime(t.event_start_time)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{t.event_location || "Campus Venue"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Perforation Divider Line */}
                  <div className="relative py-2 flex items-center justify-between">
                    <div className="w-4 h-8 bg-slate-50 dark:bg-slate-950 rounded-r-full -ml-2 border-r border-t border-b border-slate-200 dark:border-slate-800" />
                    <div className="flex-1 border-t-2 border-dashed border-slate-200 dark:border-slate-800 mx-2" />
                    <div className="w-4 h-8 bg-slate-50 dark:bg-slate-950 rounded-l-full -mr-2 border-l border-t border-b border-slate-200 dark:border-slate-800" />
                  </div>

                  {/* QR Code Presentation Box */}
                  <div className="p-5 pt-2 flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Attendee
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                        {t.attendee_name || user?.full_name || user?.email}
                      </span>

                      {isCheckedIn && t.checked_in_at && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-1">
                          Admitted {new Date(t.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}

                      <Button
                        id={`open-ticket-btn-${t.id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveModalTicket(t)}
                        className="mt-3 text-xs gap-1.5 w-fit"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Open Pass</span>
                      </Button>
                    </div>

                    {/* QR Code Box */}
                    <div
                      onClick={() => setActiveModalTicket(t)}
                      className={`w-24 h-24 p-1.5 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center cursor-pointer group-hover:scale-105 transition-transform ${
                        isCancelled ? "grayscale opacity-50" : ""
                      }`}
                      title="Click to view large pass"
                    >
                      {t.qr_code_svg ? (
                        <div
                          className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                          dangerouslySetInnerHTML={{ __html: t.qr_code_svg }}
                        />
                      ) : (
                        <QrCode className="w-12 h-12 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full-Screen Digital Pass Modal for Entrance Scanning */}
      {activeModalTicket && (
        <div
          id="ticket-modal-overlay"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveModalTicket(null)}
        >
          <div
            id="ticket-modal-card"
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setActiveModalTicket(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors z-20"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-6 pt-7 space-y-2 text-center">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/20 font-bold">
                ADMISSION PASS
              </span>
              <h2 className="text-xl font-black leading-snug">
                {activeModalTicket.event_title}
              </h2>
              <p className="text-xs text-indigo-100 flex items-center justify-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>{activeModalTicket.event_location || "Campus Venue"}</span>
              </p>
            </div>

            {/* Modal QR Code */}
            <div className="p-6 flex flex-col items-center justify-center space-y-4 text-center">
              <div
                className={`w-52 h-52 p-3 rounded-2xl bg-white shadow-md border-2 border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center ${
                  activeModalTicket.status === "cancelled" ? "grayscale opacity-50" : ""
                }`}
              >
                {activeModalTicket.qr_code_svg ? (
                  <div
                    className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: activeModalTicket.qr_code_svg }}
                  />
                ) : (
                  <QrCode className="w-32 h-32 text-slate-400" />
                )}
              </div>

              {/* Status pill & Ticket Code */}
              <div className="space-y-1">
                <span className="font-mono text-sm font-bold tracking-wider text-slate-900 dark:text-white">
                  {activeModalTicket.ticket_code}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {activeModalTicket.attendee_name || user?.full_name || user?.email}
                </p>
              </div>

              <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p>Present this QR pass to the event organizer at the entrance.</p>
                {activeModalTicket.status === "checked_in" && (
                  <p className="text-blue-600 dark:text-blue-400 font-semibold">
                    ✓ Checked in successfully
                  </p>
                )}
                {activeModalTicket.status === "cancelled" && (
                  <p className="text-rose-500 font-semibold">
                    ✕ This pass is cancelled and invalid
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
