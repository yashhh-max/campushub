"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Save } from "lucide-react";
import { fetchClubById, updateClub } from "@/lib/api";
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

export default function EditClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const clubId = resolvedParams.id;
  const router = useRouter();
  const { tokens } = useAuth();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<ClubCategory>("Technology");
  const [description, setDescription] = useState("");
  const [meetingSchedule, setMeetingSchedule] = useState("");
  const [location, setLocation] = useState("");
  const [bannerGradient, setBannerGradient] = useState(GRADIENT_OPTIONS[0].value);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [tagsInput, setTagsInput] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const club = await fetchClubById(clubId, tokens?.access);
        setName(club.name);
        setCategory(club.category);
        setDescription(club.description);
        setMeetingSchedule(club.meeting_schedule || "");
        setLocation(club.location || "");
        setBannerGradient(club.banner_gradient || GRADIENT_OPTIONS[0].value);
        setRequiresApproval(club.membership_requires_approval ?? true);
        setTagsInput((club.tags || []).join(", "));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load club details.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [clubId, tokens]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokens) return;
    setIsSaving(true);
    setError(null);

    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    try {
      await updateClub(
        clubId,
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
      router.push(`/clubs/${clubId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-20 px-4 max-w-xl mx-auto text-center space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mx-auto" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-8">
      <div>
        <Link
          href={`/clubs/${clubId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Club Page</span>
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Edit Club Information
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Update chapter details, meeting times, locations, and membership rules.
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
            Banner Theme
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
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Submit button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <Link href={`/clubs/${clubId}`}>
            <Button type="button" variant="outline" size="md">
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" size="md" isLoading={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
