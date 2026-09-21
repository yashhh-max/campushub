"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Users,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { ClubItem, EventCategory, EventItem } from "@/types/campus";
import { fetchEventById, updateEvent, deleteEvent, fetchClubs } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

const CATEGORIES: EventCategory[] = [
  "Tech",
  "Career",
  "Arts",
  "Social",
  "Academic",
  "Sports",
];

const GRADIENTS = [
  { label: "Indigo & Blue", value: "from-indigo-600 to-blue-700" },
  { label: "Amber & Orange", value: "from-amber-600 to-orange-700" },
  { label: "Cyan & Teal", value: "from-cyan-600 to-teal-700" },
  { label: "Violet & Purple", value: "from-violet-600 to-purple-800" },
  { label: "Emerald & Green", value: "from-emerald-600 to-teal-800" },
  { label: "Rose & Pink", value: "from-rose-600 to-pink-700" },
];

function isoToDateTimeLocal(isoString: string): string {
  try {
    const d = new Date(isoString);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const router = useRouter();
  const { user, tokens, isAuthenticated } = useAuth();

  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [event, setEvent] = useState<EventItem | null>(null);

  const [clubId, setClubId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("Tech");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState<number>(50);
  const [imageGradient, setImageGradient] = useState("from-indigo-600 to-blue-700");
  const [tags, setTags] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load existing event data & clubs
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [eventData, clubsList] = await Promise.all([
          fetchEventById(eventId, tokens?.access),
          fetchClubs(),
        ]);

        if (ignore) return;

        setEvent(eventData);
        setClubs(Array.isArray(clubsList) ? clubsList : clubsList.results || []);

        // Pre-fill form fields
        setTitle(eventData.title);
        setCategory(eventData.category);
        setDescription(eventData.description);
        setLocation(eventData.location);
        setStartTime(isoToDateTimeLocal(eventData.start_time));
        setEndTime(isoToDateTimeLocal(eventData.end_time));
        setCapacity(eventData.capacity);
        setImageGradient(eventData.image_gradient || "from-indigo-600 to-blue-700");
        setTags(eventData.tags ? eventData.tags.join(", ") : "");
        setIsPublished(eventData.is_published);
        setClubId(eventData.club?.id || "");
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load event for editing.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [eventId, tokens?.access]);

  // Authorization check
  const isAuthorized =
    isAuthenticated &&
    (event?.is_organizer || user?.role === "admin" || user?.is_staff);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tokens) {
      setError("You must be logged in to edit this event.");
      return;
    }

    if (!clubId) {
      setError("Please select a student organization / club.");
      return;
    }

    if (!title.trim() || !location.trim() || !description.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      setError("Event end time must be after the start time.");
      return;
    }

    if (capacity < 1) {
      setError("Event capacity must be at least 1.");
      return;
    }

    if (event && capacity < event.attendee_count) {
      setError(
        `Capacity cannot be less than the current number of registered attendees (${event.attendee_count}).`
      );
      return;
    }

    setIsSaving(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await updateEvent(
        eventId,
        {
          club: Number(clubId),
          title: title.trim(),
          category,
          description: description.trim(),
          location: location.trim(),
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          capacity: Number(capacity),
          image_gradient: imageGradient,
          tags: tagList,
          is_published: isPublished,
        },
        tokens.access
      );

      setSuccess(true);
      setTimeout(() => {
        router.push(`/events/${eventId}`);
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update event.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tokens) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteEvent(eventId, tokens.access);
      router.push("/events");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete event.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-6" />
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="space-y-4 pt-4">
            <div className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            <div className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized && !isLoading && event) {
    return (
      <div className="min-h-screen py-16 px-4 max-w-xl mx-auto text-center">
        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Organizer Access Required
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Only the creator of this event, authorized club leaders, or campus administrators can modify event settings and capacity.
          </p>
          <Link href={`/events/${eventId}`}>
            <Button variant="outline">Back to Event Details</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Event Details</span>
        </Link>

        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Event</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Permanently Delete Event?
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This will remove the event from the campus catalog and notify registered students. This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                Yes, Delete Event
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-lg shadow-slate-200/40 dark:shadow-none">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
              Event Management
            </span>
            {event && (
              <span className="text-xs text-slate-500">
                {event.attendee_count} / {event.capacity} Attendees Registered
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Edit Event Details
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Update schedule, change capacity, or adjust publishing settings.
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-sm text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>Event updated successfully! Redirecting...</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-start gap-3 text-sm text-rose-800 dark:text-rose-300"
          >
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Host Club & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="clubSelect"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Host Student Club *
              </label>
              <select
                id="clubSelect"
                value={clubId}
                onChange={(e) => setClubId(Number(e.target.value))}
                required
                className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="categorySelect"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Category *
              </label>
              <select
                id="categorySelect"
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="eventTitle"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Event Title *
            </label>
            <input
              id="eventTitle"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="eventDesc"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Description & Highlights *
            </label>
            <textarea
              id="eventDesc"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Location & Capacity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="eventLoc"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Venue / Location *
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  id="eventLoc"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="eventCap"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Seat Capacity * {event && `(Min: ${event.attendee_count})`}
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Users className="w-4 h-4" />
                </div>
                <input
                  id="eventCap"
                  type="number"
                  min={event?.attendee_count || 1}
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="block w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Start & End Times Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="startTime"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Start Date & Time *
              </label>
              <input
                id="startTime"
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="endTime"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                End Date & Time *
              </label>
              <input
                id="endTime"
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Visual Theme & Tags Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="gradientSelect"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Banner Card Gradient
              </label>
              <select
                id="gradientSelect"
                value={imageGradient}
                onChange={(e) => setImageGradient(e.target.value)}
                className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {GRADIENTS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="tagsInput"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Tags (Comma Separated)
              </label>
              <input
                id="tagsInput"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Workshop, Code, Free Food"
                className="block w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Published Checkbox */}
          <div className="flex items-center gap-2.5 pt-2">
            <input
              id="isPublished"
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
            <label
              htmlFor="isPublished"
              className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Published in campus directory (uncheck to save as draft)
            </label>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Link href={`/events/${eventId}`}>
              <Button type="button" variant="outline" size="lg">
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              size="lg"
              isLoading={isSaving}
              disabled={success}
              className="font-semibold group"
            >
              <span>Save Changes</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
