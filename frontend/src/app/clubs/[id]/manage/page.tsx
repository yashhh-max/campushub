"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Calendar,
  MessageSquare,
  Trash2,
  Edit,
  Plus,
  RefreshCw,
  Mail,
  GraduationCap,
} from "lucide-react";
import {
  fetchClubById,
  fetchClubMembers,
  approveClubMembership,
  rejectClubMembership,
  fetchClubPosts,
  deleteClubPost,
  fetchEvents,
} from "@/lib/api";
import {
  ClubItem,
  ClubMembershipItem,
  ClubRole,
  ClubPostItem,
  EventItem,
} from "@/types/campus";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function ManageClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const clubId = resolvedParams.id;
  const { user, tokens, isAuthenticated } = useAuth();

  const [club, setClub] = useState<ClubItem | null>(null);
  const [members, setMembers] = useState<ClubMembershipItem[]>([]);
  const [posts, setPosts] = useState<ClubPostItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"applications" | "members" | "posts" | "events">("applications");

  // Selected roles for pending approval
  const [assignedRoles, setAssignedRoles] = useState<Record<number, ClubRole>>({});
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const clubData = await fetchClubById(clubId, tokens?.access);
      setClub(clubData);

      const [membersData, postsData, eventsData] = await Promise.all([
        fetchClubMembers(clubData.id, tokens?.access).catch(() => ({ members: [] })),
        fetchClubPosts(clubData.id, undefined, tokens?.access).catch(() => []),
        fetchEvents({ club: clubData.id }, tokens?.access).catch(() => ({ results: [] })),
      ]);

      setMembers(membersData.members || []);
      setPosts(postsData);
      setEvents(eventsData.results || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load management dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [clubId, tokens]);

  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!tokens) return;
      setIsLoading(true);
      setError(null);
      try {
        const clubData = await fetchClubById(clubId, tokens.access);
        if (ignore) return;
        setClub(clubData);

        const [membersData, postsData, eventsData] = await Promise.all([
          fetchClubMembers(clubData.id, tokens.access).catch(() => ({ members: [] })),
          fetchClubPosts(clubData.id, undefined, tokens.access).catch(() => []),
          fetchEvents({ club: clubData.id }, tokens.access).catch(() => ({ results: [] })),
        ]);

        if (!ignore) {
          setMembers(membersData.members || []);
          setPosts(postsData);
          setEvents(eventsData.results || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load management dashboard.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [clubId, tokens]);

  const pendingApplications = members.filter((m) => m.status === "pending");
  const approvedMembers = members.filter((m) => m.status === "approved");

  const isLeader =
    club?.is_leader ||
    user?.role === "admin" ||
    user?.is_staff ||
    club?.user_membership_role === "president" ||
    club?.user_membership_role === "vice_president";

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-20 px-4 text-center max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Authentication Required</h2>
        <p className="text-sm text-slate-500">Please sign in with your club leader or administrator account.</p>
        <Link href={`/login?redirect=/clubs/${clubId}/manage`}>
          <Button variant="primary" size="md">Sign In</Button>
        </Link>
      </div>
    );
  }

  if (!isLoading && !isLeader) {
    return (
      <div className="min-h-screen py-20 px-4 text-center max-w-md mx-auto space-y-4">
        <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Unauthorized Access</h2>
        <p className="text-sm text-slate-500">
          You do not have executive management privileges for this organization.
        </p>
        <Link href={`/clubs/${clubId}`}>
          <Button variant="outline" size="sm">Back to Club</Button>
        </Link>
      </div>
    );
  }

  const handleApprove = async (membershipId: number) => {
    if (!tokens || !club) return;
    setProcessingId(membershipId);
    setFeedback(null);
    try {
      const role = assignedRoles[membershipId] || "member";
      const res = await approveClubMembership(club.id, membershipId, { role }, tokens.access);
      setFeedback(res.message);
      // Update locally
      setMembers((prev) =>
        prev.map((m) => (m.id === membershipId ? { ...m, status: "approved", role } : m))
      );
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (membershipId: number) => {
    if (!tokens || !club) return;
    if (!confirm("Are you sure you want to reject/remove this membership application?")) return;
    setProcessingId(membershipId);
    setFeedback(null);
    try {
      const res = await rejectClubMembership(club.id, membershipId, tokens.access);
      setFeedback(res.message);
      // Update locally
      setMembers((prev) => prev.filter((m) => m.id !== membershipId));
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Rejection failed.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!tokens || !club) return;
    if (!confirm("Are you sure you want to delete this community post as a moderator?")) return;
    try {
      await deleteClubPost(club.id, postId, tokens.access);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete post.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-16 px-4 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Header and Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/clubs/${clubId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Public Club Page</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {club?.name}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
              Leader Center
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadAll()} className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
          <Link href={`/clubs/${clubId}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Club Details</span>
            </Button>
          </Link>
          <Link href={`/events/create?club=${club?.id}`}>
            <Button variant="primary" size="sm" className="gap-1.5 shadow-md shadow-indigo-600/20">
              <Plus className="w-3.5 h-3.5" />
              <span>Create Event</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {feedback && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          {feedback}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pending Applications
          </span>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {pendingApplications.length}
          </p>
          <span className="text-[11px] text-slate-400">Awaiting leadership review</span>
        </Card>

        <Card className="p-5 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active Members
          </span>
          <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {approvedMembers.length}
          </p>
          <span className="text-[11px] text-slate-400">Enrolled students</span>
        </Card>

        <Card className="p-5 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Community Posts
          </span>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {posts.length}
          </p>
          <span className="text-[11px] text-slate-400">Published discussions</span>
        </Card>

        <Card className="p-5 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Hosted Events
          </span>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {events.length}
          </p>
          <span className="text-[11px] text-slate-400">Workshops &amp; meetups</span>
        </Card>
      </div>

      {/* Management Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-8">
        <button
          type="button"
          onClick={() => setActiveTab("applications")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "applications"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Membership Requests</span>
          {pendingApplications.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold">
              {pendingApplications.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "members"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Member Roster ({approvedMembers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("posts")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "posts"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Community Moderation ({posts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("events")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "events"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Events ({events.length})</span>
        </button>
      </div>

      {/* Tab 1: Membership Requests */}
      {activeTab === "applications" && (
        <div className="space-y-4">
          {pendingApplications.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                All Caught Up!
              </h3>
              <p className="text-xs text-slate-500">
                There are no pending student applications awaiting review at this time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApplications.map((app) => (
                <Card
                  key={app.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      {app.full_name ? app.full_name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {app.full_name || app.email}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {app.email}
                        </span>
                        {app.student_id && (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5" />
                            ID: {app.student_id}
                          </span>
                        )}
                        {app.department && <span>Dept: {app.department}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Role assigner */}
                    <select
                      value={assignedRoles[app.id] || "member"}
                      onChange={(e) =>
                        setAssignedRoles({
                          ...assignedRoles,
                          [app.id]: e.target.value as ClubRole,
                        })
                      }
                      className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850"
                    >
                      <option value="member">Role: Member</option>
                      <option value="moderator">Role: Moderator</option>
                      <option value="vice_president">Role: Vice President</option>
                    </select>

                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={processingId === app.id}
                      onClick={() => handleApprove(app.id)}
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={processingId === app.id}
                      onClick={() => handleReject(app.id)}
                      className="gap-1 text-rose-600 hover:bg-rose-50 border-rose-200"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Member Roster */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedMembers.map((m) => (
              <Card key={m.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    {m.full_name ? m.full_name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                      {m.full_name || m.email}
                    </h5>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium capitalize">
                      {m.title || m.role.replace("_", " ")}
                    </p>
                    <p className="text-[11px] text-slate-400">{m.email}</p>
                  </div>
                </div>

                {m.role !== "president" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReject(m.id)}
                    className="text-xs text-slate-400 hover:text-rose-600"
                    title="Remove from club"
                  >
                    Remove
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Community Moderation */}
      {activeTab === "posts" && (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No community posts have been published yet.
            </div>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="p-5 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {post.title}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">
                      {post.post_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {post.content}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    By {post.author_name} &bull; {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeletePost(post.id)}
                  className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200 gap-1 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </Button>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Hosted Events */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link href={`/events/create?club=${club?.id}`}>
              <Button variant="primary" size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>Host New Event</span>
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((ev) => (
              <Card key={ev.id} className="p-5 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                    {ev.category}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {ev.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{ev.description}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  <span>{ev.attendee_count} / {ev.capacity} seats</span>
                  <Link href={`/events/${ev.id}`} className="text-indigo-600 font-semibold hover:underline">
                    View Event &rarr;
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
