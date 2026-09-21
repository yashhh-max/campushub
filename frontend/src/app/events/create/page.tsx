"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Users,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { ClubItem, EventCategory } from "@/types/campus";
import { createEvent, fetchClubs } from "@/lib/api";
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

function getDefaultEventDates() {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(18, 0, 0, 0);

  const nextWeekEnd = new Date(nextWeek);
  nextWeekEnd.setHours(20, 0, 0, 0);

  const pad = (n: number) => String(n).padStart(2, "0");
  const format = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  return {
    start: format(nextWeek),
    end: format(nextWeekEnd),
  };
}

export default function CreateEventPage() {
  const router = useRouter();
  const { tokens } = useAuth();

  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [clubId, setClubId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("Tech");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState(() => getDefaultEventDates().start);
  const [endTime, setEndTime] = useState(() => getDefaultEventDates().end);
  const [capacity, setCapacity] = useState<number>(50);
  const [imageGradient, setImageGradient] = useState("from-indigo-600 to-blue-700");
  const [tags, setTags] = useState("Workshop, Hands-on, Students");
  const [isPublished, setIsPublished] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load available clubs
  useEffect(() => {
    async function load() {
      try {
        const res = await fetchClubs();
        const list = Array.isArray(res) ? res : res.results || [];
        setClubs(list);

        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const preselected = params.get("club");
          if (preselected && list.some((c) => String(c.id) === preselected)) {
            setClubId(Number(preselected));
            return;
          }
        }

        if (list.length > 0) {
          setClubId(Number(list[0].id));
        }
      } catch (err) {
        console.error("Failed to fetch clubs for event creation:", err);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tokens) {
      setError("You must be logged in to create events.");
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

    setIsLoading(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const newEvent = await createEvent(
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
        router.push(`/events/${newEvent.id}`);
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create event.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setTitle("Campus AI Agents & Automation Hackathon");
    setLocation("Student Innovation Center Hall B");
    setDescription(
      "Join student developers, designers, and AI researchers to build autonomous agent workflows and tools for university students. Food, snacks, and prizes provided."
    );
    setCapacity(120);
    setTags("Hackathon, AI, Python, Open to All");
    setError(null);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Events Catalog</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-lg shadow-slate-200/40 dark:shadow-none">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Host a Campus Event
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Publish your workshop, meeting, or social gathering to the CampusHub directory.
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-sm text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>Event published successfully! Redirecting to event page...</span>
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
              placeholder="e.g. AI Robotics Workshop: ROS2 Fundamentals"
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
              placeholder="Detail what attendees will experience, speakers, prerequisites, and what to bring..."
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
                  placeholder="e.g. Memorial Union Room 210"
                  className="block w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="eventCap"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Seat Capacity *
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Users className="w-4 h-4" />
                </div>
                <input
                  id="eventCap"
                  type="number"
                  min={1}
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
              Publish immediately to public campus directory
            </label>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleFillDemo}
              className="py-2 px-3 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs font-medium text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 hover:bg-indigo-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Fill Sample Event Details</span>
            </button>

            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              disabled={success}
              className="font-semibold group"
            >
              <span>Publish Event</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
