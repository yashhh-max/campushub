"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  Clock,
  Calendar,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Settings,
  ChevronRight,
  MessageSquare,
  Compass,
} from "lucide-react";
import { MyClubsResponse, MyClubItem, ClubItem } from "@/types/campus";
import { fetchMyClubs, leaveClub } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

type TabType = "all" | "active" | "pending" | "led";

export default function MyClubsDashboardPage() {
  const { user, tokens, isAuthenticated, isLoading: authLoading } = useAuth();

  const [data, setData] = useState<MyClubsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<number | null>(null);

  const loadClubs = useCallback(async () => {
    if (!tokens) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchMyClubs(tokens.access);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load club memberships.");
    } finally {
      setIsLoading(false);
    }
  }, [tokens]);

  useEffect(() => {
    let ignore = false;
    if (!isAuthenticated || !tokens) return;

    async function load() {
      try {
        const res = await fetchMyClubs(tokens!.access);
        if (!ignore) {
          setData(res);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load club memberships.");
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
  }, [isAuthenticated, tokens]);

  const handleLeaveClub = async (clubId: number, clubName: string) => {
    if (!tokens) return;
    const confirmed = window.confirm(
      `Are you sure you want to leave ${clubName}? You will lose member-only updates and discussions.`
    );
    if (!confirmed) return;

    setLeavingId(clubId);
    try {
      await leaveClub(clubId, tokens.access);
      await loadClubs();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to leave club.");
    } finally {
      setLeavingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen py-12 px-4 max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-16 px-4 max-w-xl mx-auto text-center">
        <div className="p-8 sm:p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-none">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-5">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Student Club Portal
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Sign in with your university credentials to view your club memberships, officer roles, and community discussions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login?redirect=/dashboard/clubs" className="w-full sm:w-auto">
              <Button size="lg" className="w-full font-semibold">
                Sign In to CampusHub
              </Button>
            </Link>
            <Link href="/clubs" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full">
                Explore Clubs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const joinedMemberships = data?.joined_clubs || [];
  const pendingMemberships = data?.pending_applications || [];
  const ledClubs = data?.led_clubs || [];

  const isLeaderOrAdmin =
    user?.role === "club_leader" || user?.role === "admin" || user?.is_staff || ledClubs.length > 0;

  // Filter based on active tab
  let displayedItems: { type: "joined" | "pending"; item: MyClubItem }[] = [];
  if (activeTab === "all" || activeTab === "active") {
    displayedItems = [
      ...displayedItems,
      ...joinedMemberships.map((m: MyClubItem) => ({ type: "joined" as const, item: m })),
    ];
  }
  if (activeTab === "all" || activeTab === "pending") {
    displayedItems = [
      ...displayedItems,
      ...pendingMemberships.map((m: MyClubItem) => ({ type: "pending" as const, item: m })),
    ];
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Top Header Banner */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                Community Hub
              </span>
              <span className="text-xs text-slate-500">
                {user?.profile?.department || "CampusHub University"}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              My Student Organizations
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Manage your club affiliations, track application statuses, and access your leadership dashboards.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/clubs">
              <Button variant="outline" size="sm" className="font-medium flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                <span>Explore Directory</span>
              </Button>
            </Link>
            {isLeaderOrAdmin && (
              <Link href="/clubs/create">
                <Button size="sm" className="font-medium flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Register Club</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {joinedMemberships.length}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Active Memberships
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {pendingMemberships.length}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Pending Applications
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {ledClubs.length}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Clubs Managed / Led
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Navigation Bar with Events Dashboard */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 text-xs">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-medium">
          <Calendar className="w-4 h-4" />
          <span>Looking for your event registrations, RSVPs, or tickets?</span>
        </div>
        <Link
          href="/dashboard/events"
          className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          <span>Go to My Events</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-start gap-3 text-sm text-rose-800 dark:text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Leadership Hub Section (If User Leads Any Clubs) */}
      {ledClubs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Leadership & Officer Management
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              {ledClubs.length} club{ledClubs.length > 1 ? "s" : ""} under your leadership
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ledClubs.map((club: ClubItem) => {
              const hasPending = (club.pending_applications_count ?? 0) > 0;
              return (
                <div
                  key={club.id}
                  className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between gap-4 relative overflow-hidden"
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
                      club.banner_gradient || "from-indigo-600 to-blue-600"
                    }`}
                  />
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <Badge variant="tech" className="text-xs">
                        {club.category}
                      </Badge>
                      {hasPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
                          <Clock className="w-3 h-3" />
                          <span>{club.pending_applications_count} Pending Applications</span>
                        </span>
                      )}
                    </div>

                    <Link href={`/clubs/${club.id}`}>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        {club.name}
                      </h3>
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {club.description}
                    </p>

                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <b>{club.member_count ?? 1}</b> Members
                      </span>
                      {club.meeting_schedule && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          {club.meeting_schedule}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Link href={`/clubs/${club.id}/manage`} className="flex-1">
                      <Button size="sm" className="w-full text-xs font-semibold flex items-center justify-center gap-1.5">
                        <Settings className="w-3.5 h-3.5" />
                        <span>Manage Roster & Posts</span>
                      </Button>
                    </Link>
                    <Link href={`/events/create?club=${club.id}`}>
                      <Button variant="outline" size="sm" className="text-xs font-medium">
                        + Event
                      </Button>
                    </Link>
                    <Link href={`/clubs/${club.id}/edit`}>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "all"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Memberships ({joinedMemberships.length + pendingMemberships.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "active"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active ({joinedMemberships.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "pending"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending ({pendingMemberships.length})</span>
          </button>
        </div>

        {/* Content list */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 animate-pulse"
              >
                <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {activeTab === "pending" ? "No pending applications" : "No club memberships found"}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {activeTab === "pending"
                ? "You don't have any outstanding club membership applications waiting for approval."
                : "Get involved in student life! Join student organizations to access discussions, events, and community projects."}
            </p>
            <div className="mt-6">
              <Link href="/clubs">
                <Button size="sm" className="font-semibold">
                  Browse Campus Clubs
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedItems.map(({ type, item: mem }) => {
              const club = mem.club;
              const isJoined = type === "joined" && mem.status === "approved";
              const isPending = mem.status === "pending";
              const isOfficer =
                mem.role === "president" ||
                mem.role === "vice_president" ||
                mem.role === "moderator";

              return (
                <div
                  key={mem.membership_id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="tech" className="text-xs">
                        {club.category}
                      </Badge>

                      {isJoined && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="capitalize">{mem.role.replace("_", " ")}</span>
                        </span>
                      )}

                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Under Review by Leadership</span>
                        </span>
                      )}

                      {mem.title && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                          ({mem.title})
                        </span>
                      )}
                    </div>

                    <Link href={`/clubs/${club.id}`}>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        {club.name}
                      </h3>
                    </Link>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {club.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {club.meeting_schedule && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{club.meeting_schedule}</span>
                        </div>
                      )}
                      {club.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{club.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{club.member_count ?? 1} Members</span>
                      </div>
                      <div className="text-slate-400">
                        Joined {formatDate(mem.joined_at)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    <Link href={`/clubs/${club.id}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        Club Details
                      </Button>
                    </Link>

                    {isJoined && (
                      <Link href={`/clubs/${club.id}?tab=posts`}>
                        <Button variant="outline" size="sm" className="text-xs flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Feed</span>
                        </Button>
                      </Link>
                    )}

                    {isOfficer && (
                      <Link href={`/clubs/${club.id}/manage`}>
                        <Button size="sm" className="text-xs font-semibold flex items-center gap-1">
                          <Settings className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </Button>
                      </Link>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLeaveClub(Number(club.id), club.name)}
                      isLoading={leavingId === Number(club.id)}
                      disabled={leavingId !== null}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      {isPending ? "Withdraw Application" : "Leave Club"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
