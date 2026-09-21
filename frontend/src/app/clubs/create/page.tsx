"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles, Check } from "lucide-react";
import { createClub } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ClubCategory } from "@/types/campus";
import { Button } from "@/components/ui/Button";

const GRADIENT_OPTIONS = [
  { label: "Indigo & Blue", value: "from-indigo-600 via-indigo-700 to-blue-700" },
  { label: "Violet & Fuchsia", value: "from-purple-600 via-purple-700 to-pink-600" },
  { label: "Emerald & Teal", value: "from-emerald-600 via-teal-700 to-cyan-700" },
  { label: "Amber & Orange", value: "from-amber-600 via-orange-600 to-red-600" },
  { label: "Slate & Zinc", value: "from-slate-800 via-slate-900 to-zinc-950" },
];

export default function CreateClubPage() {
  const router = useRouter();
  const { user, tokens, isAuthenticated } = useAuth();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<ClubCategory>("Technology");
  const [description, setDescription] = useState("");
  const [meetingSchedule, setMeetingSchedule] = useState("");
  const [location, setLocation] = useState("");
  const [bannerGradient, setBannerGradient] = useState(GRADIENT_OPTIONS[0].value);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [tagsInput, setTagsInput] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate =
    isAuthenticated &&
    (user?.role === "club_leader" || user?.role === "admin" || user?.is_staff);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-20 px-4 text-center max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sign In Required</h2>
        <p className="text-sm text-slate-500">You must be logged in as a club leader or admin to start a new club.</p>
        <Link href="/login?redirect=/clubs/create">
          <Button variant="primary" size="md">Sign In</Button>
        </Link>
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="min-h-screen py-20 px-4 text-center max-w-md mx-auto space-y-4">
        <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Leader Access Required</h2>
        <p className="text-sm text-slate-500">
          Only registered Club Leaders and Campus Administrators can register new campus societies.
        </p>
        <Link href="/clubs">
          <Button variant="outline" size="sm">Browse Existing Clubs</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokens) return;
    setIsLoading(true);
    setError(null);

    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    try {
      const created = await createClub(
        {
          name: name.trim(),
          category,
          description: description.trim(),
          meeting_schedule: meetingSchedule.trim(),
          location: location.trim(),
          banner_gradient: bannerGradient,
          membership_requires_approval: requiresApproval,
          tags: parsedTags,
        },
        tokens.access
      );
      router.push(`/clubs/${created.id || created.slug}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create club.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-8">
      <div>
        <Link
          href="/clubs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Clubs Directory</span>
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Register New Student Organization
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Establish an official student chapter on CampusHub with automated roster management and community discussions.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-sm font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none">
        {/* Banner Preview */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
            Club Banner Theme
          </label>
          <div className={`h-24 rounded-2xl bg-gradient-to-r ${bannerGradient} p-4 flex items-end text-white font-bold text-lg mb-3 shadow-inner`}>
            {name || "Your Club Name"}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GRADIENT_OPTIONS.map((g) => (
              <button
                key={g.label}
                type="button"
                onClick={() => setBannerGradient(g.value)}
                className={`p-2 rounded-xl text-xs font-medium border flex items-center justify-between cursor-pointer transition-all ${
                  bannerGradient === g.value
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                }`}
              >
                <span>{g.label}</span>
                {bannerGradient === g.value && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Name and Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Club / Society Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Robotics & Autonomous Systems"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ClubCategory)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Technology">Technology</option>
              <option value="STEM">STEM</option>
              <option value="Leadership">Leadership</option>
              <option value="Creative Arts">Creative Arts</option>
              <option value="Volunteering">Volunteering</option>
              <option value="Culture">Culture</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
            Mission &amp; Description *
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the club's core purpose, projects, workshops, and why students should join..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Schedule & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Meeting Schedule
            </label>
            <input
              type="text"
              value={meetingSchedule}
              onChange={(e) => setMeetingSchedule(e.target.value)}
              placeholder="e.g. Thursdays @ 6:00 PM"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Usual Location / Venue
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Turing Engineering Hall 302"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Membership Approval Toggle */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-slate-900 dark:text-white block">
              Require Leader Approval for New Members
            </span>
            <span className="text-xs text-slate-500">
              When checked, students must apply and be approved by executive officers before accessing member-only feeds.
            </span>
          </div>
          <input
            type="checkbox"
            checked={requiresApproval}
            onChange={(e) => setRequiresApproval(e.target.checked)}
            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="ai, robotics, hardware, open-source"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Submit button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <Link href="/clubs">
            <Button type="button" variant="outline" size="md">
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Register Organization</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
