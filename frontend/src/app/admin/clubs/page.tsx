"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuth } from "@/context/AuthContext";
import { institutionalApi } from "@/lib/institutionalApi";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface ClubItem {
  id: number;
  name: string;
  slug: string;
  tagline?: string;
  category: string;
  approval_status?: "pending" | "approved" | "rejected";
  is_approved?: boolean;
  member_count?: number;
  events_count?: number;
  faculty_coordinator?: string;
  president?: {
    id: number;
    full_name?: string;
    email: string;
  };
  created_at?: string;
}

export default function AdminClubsPage() {
  const { token } = useAuth();
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadClubs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await institutionalApi.getClubs(token);
      let list = Array.isArray(res) ? res : res.results || [];
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(
          (c: ClubItem) =>
            c.name.toLowerCase().includes(q) ||
            c.category?.toLowerCase().includes(q) ||
            c.tagline?.toLowerCase().includes(q)
        );
      }
      if (statusFilter !== "ALL") {
        list = list.filter((c: ClubItem) => {
          const status = c.approval_status || (c.is_approved ? "approved" : "pending");
          return status === statusFilter;
        });
      }
      setClubs(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load clubs directory");
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter]);

  useEffect(() => {
    loadClubs();
  }, [loadClubs]);

  const handleApproveClub = async (clubId: number) => {
    if (!token) return;
    try {
      await institutionalApi.approveClub(token, clubId);
      setClubs((prev) =>
        prev.map((c) =>
          c.id === clubId ? { ...c, approval_status: "approved", is_approved: true } : c
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to approve club");
    }
  };

  return (
    <AdminShell requiredPermission="CLUB_MANAGE">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Club Governance & Approvals
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Institutional oversight of student organizations, faculty coordinators, and campus chapters at KPRIT.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadClubs}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/clubs/create">
              <Button variant="primary" size="sm" className="text-xs">
                + Register New Club
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by club name or category..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="approved">Approved & Active</option>
            <option value="pending">Pending Institutional Review</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Clubs Directory Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading student organizations...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-500 text-xs font-semibold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          ) : clubs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                No clubs found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No student organizations match your search or filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">Club Organization</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Leadership</th>
                    <th className="py-3.5 px-4">Members</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {clubs.map((club) => {
                    const status = club.approval_status || (club.is_approved ? "approved" : "pending");
                    return (
                      <tr
                        key={club.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white text-sm">
                            {club.name}
                          </div>
                          {club.tagline && (
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">
                              {club.tagline}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {club.category || "General"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-slate-900 dark:text-white font-medium">
                            {club.president?.full_name || club.president?.email || "Student Lead"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Faculty: {club.faculty_coordinator || "Pending Assignment"}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {club.member_count ?? "—"}
                        </td>

                        <td className="py-3.5 px-4">
                          {status === "approved" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </span>
                          ) : status === "pending" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3" />
                              Pending Approval
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {status === "pending" && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleApproveClub(club.id)}
                                className="text-[11px] py-1 px-2.5 h-auto"
                              >
                                Approve
                              </Button>
                            )}

                            <Link
                              href={`/clubs/${club.slug || club.id}`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="View Public Club Page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
