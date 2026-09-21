"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Eye,
  Search,
  ArrowLeft,
  X,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import {
  fetchAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/api";
import {
  AnnouncementItem,
  AnnouncementCreatePayload,
  AnnouncementPriority,
  AnnouncementTargetAudience,
  AnnouncementStatus,
} from "@/types/campus";

type StatusTab = "all" | "published" | "scheduled" | "draft" | "expired";

const INITIAL_FORM: AnnouncementCreatePayload = {
  title: "",
  content: "",
  priority: "general",
  category: "Academic",
  author_title: "Campus Administration",
  target_audience: "everyone",
  target_department: "",
  target_graduation_year: undefined,
  is_published: true,
  scheduled_at: null,
  expires_at: null,
};

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null);
  const [formData, setFormData] = useState<AnnouncementCreatePayload>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Guard: Admin role only
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push("/login?redirect=/admin/announcements");
      } else if (user?.role !== "admin" && !user?.is_staff) {
        router.push("/dashboard");
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  const refreshAnnouncements = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetchAdminAnnouncements(token, {
      status: activeTab,
      priority: priorityFilter,
      search: searchQuery,
    })
      .then((res) => {
        setAnnouncements(res.results || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load announcements.");
        setLoading(false);
      });
  }, [token, activeTab, priorityFilter, searchQuery]);

  useEffect(() => {
    let active = true;
    if (isAuthenticated && token && (user?.role === "admin" || user?.is_staff)) {
      fetchAdminAnnouncements(token, {
        status: activeTab,
        priority: priorityFilter,
        search: searchQuery,
      })
        .then((res) => {
          if (active) {
            setAnnouncements(res.results || []);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (active) {
            setError(err instanceof Error ? err.message : "Failed to load announcements.");
            setLoading(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated, token, user, activeTab, priorityFilter, searchQuery]);


  const openCreateModal = () => {
    setEditingItem(null);
    setFormData(INITIAL_FORM);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: AnnouncementItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      content: item.content,
      priority: item.priority,
      category: item.category || "Academic",
      author_title: item.author_title || "Campus Administration",
      target_audience: item.target_audience || "everyone",
      target_department: item.target_department || "",
      target_graduation_year: item.target_graduation_year || undefined,
      is_published: !!item.is_published,
      scheduled_at: item.scheduled_at ? item.scheduled_at.substring(0, 16) : null,
      expires_at: item.expires_at ? item.expires_at.substring(0, 16) : null,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setModalError(null);

    try {
      const payload: AnnouncementCreatePayload = {
        ...formData,
        scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      };

      if (editingItem) {
        await updateAnnouncement(editingItem.id, payload, token);
      } else {
        await createAnnouncement(payload, token);
      }

      setIsModalOpen(false);
      refreshAnnouncements();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to save announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!confirm("Are you sure you want to permanently delete this announcement?")) return;
    try {
      await deleteAnnouncement(id, token);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("Failed to delete announcement.");
    }
  };

  const getPriorityBadge = (priority: AnnouncementPriority) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "official":
        return "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "general":
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const getStatusBadge = (status: AnnouncementStatus) => {
    switch (status) {
      case "published":
        return "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200";
      case "scheduled":
        return "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200";
      case "draft":
        return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200";
      case "expired":
        return "bg-rose-50 dark:bg-rose-950/40 text-rose-500 border-rose-200";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 font-bold">
            Administrator Mode
          </span>
        </div>

        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Announcement Management
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Publish campus bulletins, schedule releases, and target academic cohorts.
                </p>
              </div>
            </div>
          </div>

          <Button
            id="create-announcement-btn"
            variant="primary"
            size="md"
            onClick={openCreateModal}
            className="flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Announcement</span>
          </Button>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            {(["all", "published", "scheduled", "draft", "expired"] as StatusTab[]).map((tab) => (
              <button
                key={tab}
                id={`status-tab-${tab}`}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search and Priority Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="announcement-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search announcements by title or content..."
                className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                id="priority-filter-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="official">Official</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>
        </div>

        {/* Announcements Table / Feed */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Loading announcement repository...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-500 text-xs font-semibold">
              {error}
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                No announcements match this filter
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create a new announcement or adjust your status and priority filters above.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  id={`announcement-row-${item.id}`}
                  className="p-5 sm:p-6 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getPriorityBadge(
                          item.priority
                        )}`}
                      >
                        {item.priority}
                      </span>
                      <span
                        className={`text-[10px] font-bold capitalize px-2 py-0.5 rounded-full border ${getStatusBadge(
                          item.computed_status || "published"
                        )}`}
                      >
                        {item.computed_status || "published"}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        • {item.category}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {item.target_audience === "everyone"
                          ? "All Campus"
                          : item.target_audience === "department"
                          ? `Dept: ${item.target_department}`
                          : item.target_audience === "graduation_year"
                          ? `Class of ${item.target_graduation_year}`
                          : `${item.target_department} (${item.target_graduation_year})`}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {item.content}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                      {item.scheduled_at && (
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <Calendar className="w-3 h-3" />
                          Release: {new Date(item.scheduled_at).toLocaleString()}
                        </span>
                      )}
                      {item.expires_at && (
                        <span className="flex items-center gap-1 text-rose-500">
                          <Clock className="w-3 h-3" />
                          Expires: {new Date(item.expires_at).toLocaleString()}
                        </span>
                      )}
                      <span>
                        Created: {item.created_at ? new Date(item.created_at).toLocaleDateString() : "Recent"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      id={`edit-announcement-btn-${item.id}`}
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Announcement"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      id={`delete-announcement-btn-${item.id}`}
                      type="button"
                      onClick={() => handleDelete(Number(item.id))}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Create / Edit Announcement */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in-50 duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {editingItem ? "Edit Announcement" : "Create Campus Announcement"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {modalError}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Title *
                  </label>
                  <input
                    id="modal-title-input"
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Severe Weather Campus Advisory"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Announcement Body *
                  </label>
                  <textarea
                    id="modal-content-input"
                    required
                    rows={4}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Provide clear details, instructions, or deadlines for students..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Priority & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Priority Level *
                    </label>
                    <select
                      id="modal-priority-select"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: e.target.value as AnnouncementPriority,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="general">General (Standard Bulletin)</option>
                      <option value="official">Official (University Administration)</option>
                      <option value="urgent">Urgent (High Priority / Action Required)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g. Academic, Health, Facilities"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Target Audience */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Target Audience *
                    </label>
                    <select
                      id="modal-target-audience-select"
                      value={formData.target_audience}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          target_audience: e.target.value as AnnouncementTargetAudience,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="everyone">Everyone (All Students & Faculty)</option>
                      <option value="department">Specific Department</option>
                      <option value="graduation_year">Specific Graduation Year</option>
                      <option value="both">Specific Department & Graduation Year</option>
                    </select>
                  </div>

                  {(formData.target_audience === "department" ||
                    formData.target_audience === "both") && (
                    <div className="space-y-1 animate-in fade-in-50">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Target Department *
                      </label>
                      <input
                        id="modal-target-department-input"
                        type="text"
                        required
                        value={formData.target_department}
                        onChange={(e) =>
                          setFormData({ ...formData, target_department: e.target.value })
                        }
                        placeholder="e.g. Software Engineering, Computer Science"
                        className="w-full px-3.5 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {(formData.target_audience === "graduation_year" ||
                    formData.target_audience === "both") && (
                    <div className="space-y-1 animate-in fade-in-50">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Target Graduation Year *
                      </label>
                      <input
                        id="modal-target-graduation-year-input"
                        type="number"
                        required
                        min={2024}
                        max={2035}
                        value={formData.target_graduation_year || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            target_graduation_year: e.target.value
                              ? parseInt(e.target.value, 10)
                              : undefined,
                          })
                        }
                        placeholder="e.g. 2027"
                        className="w-full px-3.5 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {/* Scheduling and Publishing Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Schedule Release (Optional)
                    </label>
                    <input
                      id="modal-scheduled-at-input"
                      type="datetime-local"
                      value={formData.scheduled_at || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, scheduled_at: e.target.value || null })
                      }
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Auto-Expire (Optional)
                    </label>
                    <input
                      id="modal-expires-at-input"
                      type="datetime-local"
                      value={formData.expires_at || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, expires_at: e.target.value || null })
                      }
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Immediate Publication Toggle */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Publish Status
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Uncheck to save as draft without exposing or notifying students.
                    </p>
                  </div>
                  <button
                    id="modal-is-published-toggle"
                    type="button"
                    role="switch"
                    aria-checked={formData.is_published}
                    onClick={() =>
                      setFormData({ ...formData, is_published: !formData.is_published })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      formData.is_published ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        formData.is_published ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Live Preview Box */}
                <div className="p-4 rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live Student Preview Card</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${getPriorityBadge(
                          formData.priority
                        )}`}
                      >
                        {formData.priority}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {formData.title || "Announcement Title Preview"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {formData.content || "Your announcement body will be shown here..."}
                    </p>
                  </div>
                </div>

                {/* Submit buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    id="submit-announcement-modal-btn"
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Saving..."
                      : editingItem
                      ? "Save Changes"
                      : "Publish Announcement"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
