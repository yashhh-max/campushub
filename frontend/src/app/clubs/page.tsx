"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Compass,
  Clock,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Hourglass,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { fetchClubs } from "@/lib/api";
import { ClubItem } from "@/types/campus";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const CATEGORIES: { label: string; value: string }[] = [
  { label: "All Categories", value: "all" },
  { label: "Technology", value: "Technology" },
  { label: "STEM", value: "STEM" },
  { label: "Leadership", value: "Leadership" },
  { label: "Creative Arts", value: "Creative Arts" },
  { label: "Volunteering", value: "Volunteering" },
  { label: "Culture", value: "Culture" },
];

export default function ClubsPage() {
  const { user, tokens, isAuthenticated } = useAuth();
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const canCreateClub =
    isAuthenticated &&
    (user?.role === "club_leader" || user?.role === "admin" || user?.is_staff);

  const loadClubs = async (category = selectedCategory, search = searchQuery) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchClubs(
        {
          category: category !== "all" ? category : undefined,
          search: search.trim() || undefined,
        },
        tokens?.access
      );
      setClubs(data.results || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load clubs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchClubs(
          {
            category: selectedCategory !== "all" ? selectedCategory : undefined,
            search: searchQuery.trim() || undefined,
          },
          tokens?.access
        );
        if (!ignore) {
          setClubs(data.results || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load clubs.");
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
  }, [selectedCategory, searchQuery, tokens]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadClubs();
  };

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 p-8 sm:p-12 text-white shadow-xl shadow-indigo-950/20">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Compass className="w-3.5 h-3.5" />
              <span>Campus Community Hub</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Discover Clubs &amp; Societies
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Join active campus organizations, engage in community discussion feeds, participate in exclusive meetings, and connect with peer leaders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canCreateClub && (
              <Link href="/clubs/create">
                <Button variant="primary" size="md" className="gap-2 shadow-lg shadow-indigo-600/30">
                  <Plus className="w-4 h-4" />
                  <span>Start New Club</span>
                </Button>
              </Link>
            )}
            {isAuthenticated && (
              <Link href="/dashboard/clubs">
                <Button variant="outline" size="md" className="border-indigo-400/40 text-indigo-200 hover:bg-white/10">
                  <span>My Clubs Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Search and Category Filters */}
      <div className="space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clubs by name, mission, or tags..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button type="submit" variant="primary" size="md">
            Search
          </Button>
          {(searchQuery || selectedCategory !== "all") && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
            >
              Reset
            </Button>
          )}
        </form>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.value
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800"
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-8 text-center rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 max-w-lg mx-auto space-y-3">
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadClubs()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && clubs.length === 0 && (
        <div className="py-16 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Clubs Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No organizations matched your current search or category filter. Try clearing your filters or explore other categories.
            </p>
          </div>
          {canCreateClub && (
            <Link href="/clubs/create">
              <Button variant="primary" size="sm" className="gap-1.5 mt-2">
                <Plus className="w-3.5 h-3.5" />
                <span>Create a Club</span>
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Clubs Grid */}
      {!isLoading && !error && clubs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map((club) => {
            const isUserMember = club.user_membership_status === "approved";
            const isPending = club.user_membership_status === "pending";

            return (
              <Card
                key={club.id}
                className="overflow-hidden flex flex-col justify-between group hover:border-indigo-300 dark:hover:border-indigo-700/80 transition-all duration-200"
              >
                <div>
                  {/* Card Banner Header */}
                  <div
                    className={`h-24 bg-gradient-to-r ${
                      club.banner_gradient || "from-indigo-600 to-blue-700"
                    } p-4 flex items-start justify-between relative`}
                  >
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 backdrop-blur-md shadow-sm">
                      {club.category}
                    </span>

                    {/* Membership Status Badge */}
                    {club.is_leader && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-sm">
                        <ShieldCheck className="w-3 h-3" />
                        Leader
                      </span>
                    )}
                    {!club.is_leader && isUserMember && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        Member
                      </span>
                    )}
                    {!club.is_leader && isPending && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/90 text-white shadow-sm">
                        <Hourglass className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="p-6 space-y-4">
                    <div>
                      <Link href={`/clubs/${club.id || club.slug}`}>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {club.name}
                        </h3>
                      </Link>
                      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                        {club.description}
                      </p>
                    </div>

                    {/* Meta info */}
                    <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <strong className="text-slate-700 dark:text-slate-200">
                            {club.member_count ?? 0}
                          </strong>{" "}
                          members
                        </span>
                        {club.leader_name && (
                          <span className="text-[11px] text-slate-500 truncate max-w-[140px]">
                            Pres: {club.leader_name}
                          </span>
                        )}
                      </div>

                      {club.meeting_schedule && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Clock className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                          <span className="truncate">{club.meeting_schedule}</span>
                        </div>
                      )}

                      {club.location && (
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                          <span className="truncate">{club.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {club.tags && club.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {club.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-auto">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {club.events_count ? `${club.events_count} upcoming events` : "Active Chapter"}
                  </span>
                  <Link href={`/clubs/${club.id || club.slug}`}>
                    <Button variant="ghost" size="sm" className="text-xs text-indigo-600 dark:text-indigo-400 gap-1">
                      <span>View Club</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
