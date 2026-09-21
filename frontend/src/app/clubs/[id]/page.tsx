"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  Users,
  Clock,
  MapPin,
  ShieldCheck,
  Calendar,
  MessageSquare,
  Plus,
  Pin,
  Trash2,
  Edit,
  ArrowLeft,
  CheckCircle2,
  Hourglass,
  LogIn,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  fetchClubById,
  joinClub,
  leaveClub,
  fetchClubPosts,
  createClubPost,
  deleteClubPost,
  fetchEvents,
  fetchClubMembers,
} from "@/lib/api";
import {
  ClubItem,
  ClubPostItem,
  ClubPostType,
  EventItem,
  ClubMembershipItem,
} from "@/types/campus";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const clubId = resolvedParams.id;
  const { user, tokens, isAuthenticated } = useAuth();

  const [club, setClub] = useState<ClubItem | null>(null);
  const [posts, setPosts] = useState<ClubPostItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [members, setMembers] = useState<ClubMembershipItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<"feed" | "events" | "roster">("feed");

  // Post creation modal / form state
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState<ClubPostType>("discussion");
  const [isMembersOnly, setIsMembersOnly] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Membership action loading state
  const [isMembershipLoading, setIsMembershipLoading] = useState(false);
  const [membershipFeedback, setMembershipFeedback] = useState<string | null>(null);

  // Feed filter
  const [selectedPostType, setSelectedPostType] = useState<string>("all");

  const isLeader =
    club?.is_leader ||
    user?.role === "admin" ||
    user?.is_staff ||
    club?.user_membership_role === "president" ||
    club?.user_membership_role === "vice_president";

  const isApprovedMember = club?.user_membership_status === "approved";
  const isPendingMember = club?.user_membership_status === "pending";

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const clubData = await fetchClubById(clubId, tokens?.access);
      setClub(clubData);

      // Load Posts, Events, and Members in parallel
      const [postsData, eventsData, membersData] = await Promise.all([
        fetchClubPosts(clubData.id, undefined, tokens?.access).catch(() => []),
        fetchEvents({ club: clubData.id }, tokens?.access).catch(() => ({ results: [] })),
        fetchClubMembers(clubData.id, tokens?.access).catch(() => ({ members: [] })),
      ]);

      setPosts(postsData);
      setEvents(eventsData.results || []);
      setMembers(membersData.members || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load club details.");
    } finally {
      setIsLoading(false);
    }
  }, [clubId, tokens]);

  useEffect(() => {
    let ignore = false;
    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const clubData = await fetchClubById(clubId, tokens?.access);
        if (ignore) return;
        setClub(clubData);

        const [postsData, eventsData, membersData] = await Promise.all([
          fetchClubPosts(clubData.id, undefined, tokens?.access).catch(() => []),
          fetchEvents({ club: clubData.id }, tokens?.access).catch(() => ({ results: [] })),
          fetchClubMembers(clubData.id, tokens?.access).catch(() => ({ members: [] })),
        ]);

        if (!ignore) {
          setPosts(postsData);
          setEvents(eventsData.results || []);
          setMembers(membersData.members || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load club details.");
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
  }, [clubId, tokens?.access]);

  // Handle Join / Leave
  const handleJoin = async () => {
    if (!tokens || !club) return;
    setIsMembershipLoading(true);
    setMembershipFeedback(null);
    try {
      const res = await joinClub(club.id, tokens.access);
      setMembershipFeedback(res.message);
      await loadData();
    } catch (err: unknown) {
      setMembershipFeedback(err instanceof Error ? err.message : "Failed to join club.");
    } finally {
      setIsMembershipLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!tokens || !club) return;
    if (!confirm(`Are you sure you want to leave ${club.name}?`)) return;
    setIsMembershipLoading(true);
    setMembershipFeedback(null);
    try {
      const res = await leaveClub(club.id, tokens.access);
      setMembershipFeedback(res.message);
      await loadData();
    } catch (err: unknown) {
      setMembershipFeedback(err instanceof Error ? err.message : "Failed to leave club.");
    } finally {
      setIsMembershipLoading(false);
    }
  };

  // Handle Post Creation
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokens || !club) return;
    setIsSubmittingPost(true);
    setPostError(null);
    try {
      const newPost = await createClubPost(
        club.id,
        {
          title: postTitle,
          content: postContent,
          post_type: postType,
          is_pinned: isPinned,
          is_members_only: isMembersOnly,
        },
        tokens.access
      );
      setPosts([newPost, ...posts]);
      setShowPostModal(false);
      setPostTitle("");
      setPostContent("");
      setPostType("discussion");
      setIsPinned(false);
      setIsMembersOnly(false);
    } catch (err: unknown) {
      setPostError(err instanceof Error ? err.message : "Failed to create post.");
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Handle Post Delete
  const handleDeletePost = async (postId: number) => {
    if (!tokens || !club) return;
    if (!confirm("Are you sure you want to remove this post?")) return;
    try {
      await deleteClubPost(club.id, postId, tokens.access);
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete post.");
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (selectedPostType === "all") return true;
    return p.post_type === selectedPostType;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen py-16 px-4 max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-1/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-56 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="min-h-screen py-20 px-4 text-center max-w-md mx-auto space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Club Not Available</h2>
        <p className="text-sm text-slate-500">{error || "The requested club could not be found."}</p>
        <Link href="/clubs">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Clubs</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Back link and Management toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/clubs"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Student Organizations</span>
        </Link>

        <div className="flex items-center gap-2">
          {(isLeader || isApprovedMember || user?.role === "admin") && (
            <Link id="open-club-chat-btn" href={`/clubs/${club.id}/chat`}>
              <Button variant="primary" size="sm" className="gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md shadow-indigo-600/25">
                <MessageSquare className="w-4 h-4" />
                <span>Live Chat</span>
              </Button>
            </Link>
          )}

          {isLeader && (
            <>
              <Link href={`/clubs/${club.id}/manage`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span>Manage</span>
                  {club.pending_applications_count ? (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {club.pending_applications_count}
                    </span>
                  ) : null}
                </Button>
              </Link>
              <Link href={`/clubs/${club.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Main Club Banner & Header Card */}
      <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/40 dark:shadow-none">
        {/* Banner Gradient */}
        <div
          className={`h-48 sm:h-64 bg-gradient-to-r ${
            club.banner_gradient || "from-indigo-600 via-indigo-700 to-blue-700"
          } p-6 sm:p-10 flex flex-col justify-between text-white relative`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 z-10">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/30">
              {club.category}
            </span>

            {/* Status pills */}
            {isLeader && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500 text-white shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                Executive Leadership
              </span>
            )}
            {!isLeader && isApprovedMember && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500 text-white shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active Member
              </span>
            )}
            {!isLeader && isPendingMember && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/90 text-white shadow-sm">
                <Hourglass className="w-3.5 h-3.5" />
                Application Pending Review
              </span>
            )}
          </div>

          <div className="z-10 space-y-1">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {club.name}
            </h1>
            {club.leader_name && (
              <p className="text-sm text-indigo-100 font-medium">
                Chapter President: {club.leader_name}
              </p>
            )}
          </div>
        </div>

        {/* Club Details Ribbons */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {club.member_count ?? 0}
                  </strong>{" "}
                  Active Members
                </span>
              </div>

              {club.meeting_schedule && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>{club.meeting_schedule}</span>
                </div>
              )}

              {club.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>{club.location}</span>
                </div>
              )}
            </div>

            {/* Interactive Join / Leave Action Button */}
            <div className="flex items-center gap-3">
              {!isAuthenticated ? (
                <Link href={`/login?redirect=/clubs/${club.id}`}>
                  <Button variant="primary" size="md" className="gap-2">
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Join</span>
                  </Button>
                </Link>
              ) : isLeader ? (
                <Link href={`/clubs/${club.id}/manage`}>
                  <Button variant="outline" size="md" className="gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <span>Manage Roster</span>
                  </Button>
                </Link>
              ) : isApprovedMember ? (
                <Button
                  variant="outline"
                  size="md"
                  isLoading={isMembershipLoading}
                  onClick={handleLeave}
                  className="border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors"
                >
                  <span>Member (Leave Club)</span>
                </Button>
              ) : isPendingMember ? (
                <Button variant="secondary" size="md" disabled className="gap-2 opacity-80 cursor-default">
                  <Hourglass className="w-4 h-4 text-amber-500" />
                  <span>Application Pending</span>
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  isLoading={isMembershipLoading}
                  onClick={handleJoin}
                  className="gap-2 shadow-lg shadow-indigo-600/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {club.membership_requires_approval ? "Apply for Membership" : "Join Club"}
                  </span>
                </Button>
              )}
            </div>
          </div>

          {/* Feedback banner */}
          {membershipFeedback && (
            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {membershipFeedback}
            </div>
          )}

          {/* Mission & Tags */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">About the Chapter</h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {club.description}
            </p>

            {club.tags && club.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {club.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("feed")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "feed"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Community Feed</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
              {posts.length}
            </span>
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
            <span>Hosted Events</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
              {events.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roster")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "roster"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Members &amp; Officers</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
              {members.length}
            </span>
          </button>
        </div>

        {/* Tab Actions */}
        {activeTab === "feed" && (isApprovedMember || isLeader) && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowPostModal(true)}
            className="gap-1.5 mb-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Post</span>
          </Button>
        )}

        {activeTab === "events" && isLeader && (
          <Link href={`/events/create?club=${club.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5 mb-2">
              <Plus className="w-3.5 h-3.5" />
              <span>Host Event</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Tab 1: Community Feed */}
      {activeTab === "feed" && (
        <div className="space-y-6">
          {/* Filter pills */}
          <div className="flex items-center gap-2">
            {["all", "announcement", "update", "discussion"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedPostType(t)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                  selectedPostType === t
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {t === "all" ? "All Posts" : `${t}s`}
              </button>
            ))}
          </div>

          {filteredPosts.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No Posts Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Be the first to start a conversation or check back later for announcements and community updates!
              </p>
              {(isApprovedMember || isLeader) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPostModal(true)}
                  className="gap-1.5 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Publish First Post</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  className={`p-6 space-y-3 ${
                    post.is_pinned
                      ? "border-amber-400/80 dark:border-amber-600/60 bg-amber-50/20 dark:bg-amber-950/10"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                        {post.author_name ? post.author_name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {post.author_name}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {post.author_role}
                          </span>
                          {post.is_members_only && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                              Members Only
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(post.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {post.is_pinned && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 rounded-full">
                          <Pin className="w-3 h-3" />
                          Pinned
                        </span>
                      )}
                      <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {post.post_type}
                      </span>
                      {post.can_delete && (
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Delete post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                      {post.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Hosted Events */}
      {activeTab === "events" && (
        <div className="space-y-6">
          {events.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-3">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No Upcoming Events</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                This club does not currently have any scheduled upcoming workshops or events.
              </p>
              {isLeader && (
                <Link href={`/events/create?club=${club.id}`}>
                  <Button variant="primary" size="sm" className="gap-1.5 mt-2">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Host Club Event</span>
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map((ev) => (
                <Card key={ev.id} className="p-6 flex flex-col justify-between group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        {ev.category}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {ev.available_seats} seats left
                      </span>
                    </div>

                    <Link href={`/events/${ev.id}`}>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {ev.title}
                      </h4>
                    </Link>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {ev.description}
                    </p>

                    <div className="text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{new Date(ev.start_time).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{ev.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-4">
                    <span className="text-xs font-medium text-slate-400">
                      {ev.attendee_count} registered
                    </span>
                    <Link href={`/events/${ev.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs text-indigo-600 dark:text-indigo-400 gap-1">
                        <span>Details</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Members & Leadership Roster */}
      {activeTab === "roster" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {members.map((m) => (
              <Card key={m.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {m.full_name ? m.full_name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {m.full_name || m.email}
                  </h5>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate capitalize">
                    {m.title || m.role.replace("_", " ")}
                  </p>
                  {m.department && (
                    <p className="text-[10px] text-slate-400 truncate">{m.department}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* New Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Create Club Post
              </h3>
              <button
                type="button"
                onClick={() => setShowPostModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {postError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {postError}
              </div>
            )}

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="What would you like to share?"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Post Type
                </label>
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value as ClubPostType)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="discussion">Discussion (All Members)</option>
                  {isLeader && <option value="announcement">Official Announcement</option>}
                  {isLeader && <option value="update">Project / Meeting Update</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Content
                </label>
                <textarea
                  required
                  rows={4}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share details, agendas, questions, or ideas with your fellow club members..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMembersOnly}
                    onChange={(e) => setIsMembersOnly(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Members-only Visibility</span>
                </label>

                {isLeader && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                    <span>Pin to Top of Feed</span>
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPostModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingPost}>
                  Publish Post
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
