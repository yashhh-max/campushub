"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuth } from "@/context/AuthContext";
import { institutionalApi } from "@/lib/institutionalApi";
import { ApprovalRequest, ApprovalActionPayload } from "@/types/institutional";
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  Calendar,
  Users,
  Bell,
  Award,
  Filter,
  X,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

type QueueTab = "pending" | "approved" | "rejected" | "changes_requested" | "all";

export default function AdminApprovalsPage() {
  const { token } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<QueueTab>("pending");
  const [itemTypeFilter, setItemTypeFilter] = useState<string>("ALL");

  // Review Action Modal
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "request_changes">("approve");
  const [comments, setComments] = useState("");
  const [processing, setProcessing] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await institutionalApi.getApprovals(token, {
        status: activeTab !== "all" ? activeTab : undefined,
        item_type: itemTypeFilter !== "ALL" ? itemTypeFilter : undefined,
      });
      setApprovals(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load approval queue");
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, itemTypeFilter]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedRequest) return;
    setProcessing(true);
    setModalError(null);
    try {
      const payload: ApprovalActionPayload = {
        action: actionType,
        comments: comments.trim() || undefined,
      };
      await institutionalApi.actionApproval(token, selectedRequest.id, payload);
      setSelectedRequest(null);
      setComments("");
      loadApprovals();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to execute approval action");
    } finally {
      setProcessing(false);
    }
  };

  const getItemTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "event":
        return <Calendar className="w-4 h-4 text-indigo-500" />;
      case "club":
        return <Users className="w-4 h-4 text-blue-500" />;
      case "announcement":
        return <Bell className="w-4 h-4 text-amber-500" />;
      case "opportunity":
        return <Award className="w-4 h-4 text-emerald-500" />;
      default:
        return <CheckSquare className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "pending":
        return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "rejected":
        return "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "changes_requested":
        return "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <AdminShell requiredPermission="EVENT_APPROVE">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Unified Institutional Approval Center
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Centralized queue for reviewing and approving campus events, clubs, official notices, and opportunities.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadApprovals}
            className="flex items-center gap-1.5 text-xs self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
        </div>

        {/* Tab Controls */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            {(["pending", "approved", "changes_requested", "rejected", "all"] as QueueTab[]).map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                    activeTab === tab
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab.replace(/_/g, " ")}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={itemTypeFilter}
              onChange={(e) => setItemTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Resource Types</option>
              <option value="event">Campus Events</option>
              <option value="club">Student Clubs</option>
              <option value="announcement">Official Announcements</option>
              <option value="opportunity">Opportunities</option>
            </select>
          </div>
        </div>

        {/* Queue Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading institutional approval queue...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-500 text-xs font-semibold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          ) : approvals.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                Queue is Clear
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No items are currently waiting for your review in this status category.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">Resource</th>
                    <th className="py-3.5 px-4">Submitted By</th>
                    <th className="py-3.5 px-4">Submitted At</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Reviewer Notes</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {approvals.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                            {getItemTypeIcon(req.item_type)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white text-sm">
                              {req.title}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                              {req.item_type} #{req.item_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {req.submitted_by_name || "Campus Organizer"}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(req.created_at).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                            req.status
                          )}`}
                        >
                          {req.status.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {req.review_comments || "—"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {req.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setSelectedRequest(req);
                                setActionType("approve");
                                setComments("");
                              }}
                              className="text-[11px] py-1 px-2.5 h-auto bg-emerald-600 hover:bg-emerald-700 border-none text-white"
                            >
                              Approve
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(req);
                                setActionType("request_changes");
                                setComments("");
                              }}
                              className="text-[11px] py-1 px-2.5 h-auto text-amber-600 border-amber-300 hover:bg-amber-50"
                            >
                              Revise
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(req);
                                setActionType("reject");
                                setComments("");
                              }}
                              className="text-[11px] py-1 px-2.5 h-auto text-rose-600 border-rose-300 hover:bg-rose-50"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Reviewed by {req.reviewed_by_name || "Admin"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Execute Approval Action */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in-50 duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                      {actionType.replace(/_/g, " ")} Request
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate max-w-xs">
                      {selectedRequest.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleActionSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Review Decision
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) =>
                      setActionType(
                        e.target.value as "approve" | "reject" | "request_changes"
                      )
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="approve">Approve & Publish Immediately</option>
                    <option value="request_changes">Request Changes from Organizer</option>
                    <option value="reject">Reject Request</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Review Feedback / Reason
                  </label>
                  <textarea
                    rows={3}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Provide specific notes or reasons for the student coordinator..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={processing}
                  >
                    {processing ? "Processing..." : "Confirm Decision"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
