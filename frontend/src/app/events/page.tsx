"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, CalendarDays, RefreshCw, AlertCircle } from "lucide-react";
import { EventItem, PaginatedEventsResponse } from "@/types/campus";
import { fetchEvents } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { EventCard } from "@/components/events/EventCard";
import { EventFilterBar } from "@/components/events/EventFilterBar";
import { Button } from "@/components/ui/Button";

export default function EventsDiscoveryPage() {
  const { user, tokens } = useAuth();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [upcomingOnly, setUpcomingOnly] = useState(true);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data: PaginatedEventsResponse = await fetchEvents(
        {
          search: search.trim() || undefined,
          category: category !== "All" ? category : undefined,
          upcoming: upcomingOnly,
          page,
        },
        tokens?.access
      );
      setEvents(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load events.");
    } finally {
      setIsLoading(false);
    }
  }, [search, category, upcomingOnly, page, tokens]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEvents();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadEvents]);

  const handleResetFilters = () => {
    setSearch("");
    setCategory("All");
    setUpcomingOnly(true);
    setPage(1);
  };

  const isLeaderOrAdmin =
    user?.role === "club_leader" || user?.role === "admin" || user?.is_staff;

  const totalPages = Math.ceil(totalCount / 9) || 1;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-2">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Collegiate Events Catalog</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Discover Campus Events
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Browse hackathons, career workshops, guest lectures, and campus socials.
          </p>
        </div>

        {isLeaderOrAdmin && (
          <div>
            <Link href="/events/create">
              <Button variant="primary" size="md" className="group shadow-sm">
                <Plus className="w-4 h-4 mr-1 group-hover:rotate-90 transition-transform" />
                <span>Host an Event</span>
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <EventFilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        category={category}
        onCategoryChange={(cat) => {
          setCategory(cat);
          setPage(1);
        }}
        upcomingOnly={upcomingOnly}
        onUpcomingToggle={(val) => {
          setUpcomingOnly(val);
          setPage(1);
        }}
        onReset={handleResetFilters}
      />

      {/* Error Banner */}
      {error && (
        <div className="mb-8 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-3 text-sm text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadEvents}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 animate-pulse"
            >
              <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
              <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full w-full mt-4" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <CalendarDays className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No events match your criteria
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms, changing category filters, or viewing past events.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Reset Filters
            </Button>
            {isLeaderOrAdmin && (
              <Link href="/events/create">
                <Button variant="primary" size="sm">
                  Create First Event
                </Button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        /* Events Grid */
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
              <span className="text-xs text-slate-500">
                Showing page {page} of {totalPages} ({totalCount} total events)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
