"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuth } from "@/context/AuthContext";
import { fetchAdminAnalytics, fetchApprovalRequests, fetchAuditLogs } from "@/lib/institutionalApi";
import { AdminAnalytics, ApprovalRequest, AuditLog } from "@/types/institutional";
import {
  Users,
  GraduationCap,
  Award,
  Calendar,
  CheckSquare,
  Briefcase,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Building2,
  Bell,
  Sparkles,
  Clock,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    Promise.all([
      fetchAdminAnalytics(token),
      fetchApprovalRequests(token, { status: "pending" }),
      fetchAuditLogs(token),
    ])
      .then(([analyticsData, approvalsData, logsData]) => {
        setAnalytics(analyticsData);
        setPendingApprovals(approvalsData);
        const logs = Array.isArray(logsData) ? logsData : (logsData as any)?.results || [];
        setRecentLogs(logs.slice(0, 6));
      })
      .catch((err) => {
        setError(err.message || "Failed to load institutional analytics.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  const metrics = analytics?.metrics;

  return (
    <AdminShell
      title="Institutional Command Center"
      subtitle="Kommuri Pratap Reddy Institute of Technology (KPRIT) — Central Administration"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/approvals"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Review Approvals ({pendingApprovals.length})</span>
          </Link>
          <Link
            href="/tpo/dashboard"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all"
          >
            <Briefcase className="w-4 h-4" />
            <span>TPO Console</span>
          </Link>
        </div>
      }
    >
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Enrolled Students</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {isLoading ? "—" : (metrics?.total_students ?? 0).toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">{metrics?.placed_students ?? 0}</span> students placed in 2026 season
          </div>
        </div>

        {/* Total Faculty */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Faculty & HODs</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {isLoading ? "—" : (metrics?.total_faculty ?? 0).toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            Across 9 KPRIT academic departments
          </div>
        </div>

        {/* Campus Events & Attendance */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Event Attendance</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {isLoading ? "—" : `${metrics?.attendance_rate_pct ?? 0}%`}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>{metrics?.checked_in_attendance ?? 0}</span> checked in of {metrics?.total_rsvps ?? 0} total RSVPs
          </div>
        </div>

        {/* Placement Drives */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active TPO Drives</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {isLoading ? "—" : (metrics?.active_drives ?? 0).toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>{metrics?.total_companies ?? 0}</span> corporate recruiters registered
          </div>
        </div>
      </div>

      {/* Middle Row: Pending Approvals & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals Queue Card */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Institutional Approval Queue</h3>
                <p className="text-[11px] text-slate-400">Requires administrative verification prior to publication</p>
              </div>
            </div>
            <Link
              href="/admin/approvals"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400/60" />
              <span>Approval queue is clear. No pending institutional requests.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {pendingApprovals.slice(0, 4).map((req) => (
                <div key={req.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-indigo-400 border border-slate-700">
                        {req.item_type}
                      </span>
                      <span className="text-xs font-semibold text-slate-200 truncate">{req.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">Requested by {req.requested_by_name} ({req.requested_by_email})</p>
                  </div>
                  <Link
                    href="/admin/approvals"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium shrink-0 transition-colors"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Operations Shortcuts */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3.5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Administrative Actions</span>
          </h3>
          <p className="text-[11px] text-slate-400">Institutional workflows and provisioning shortcuts</p>

          <div className="space-y-2 pt-1">
            <Link
              href="/admin/users/faculty"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 transition-all text-xs font-medium text-slate-200 group"
            >
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-blue-400" />
                <span>Provision Faculty / HOD Account</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
            </Link>

            <Link
              href="/admin/departments"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 transition-all text-xs font-medium text-slate-200 group"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>Manage Academic Departments</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
            </Link>

            <Link
              href="/admin/notifications"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 transition-all text-xs font-medium text-slate-200 group"
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Broadcast Targeted Notice</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
            </Link>

            <Link
              href="/tpo/drives"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 transition-all text-xs font-medium text-slate-200 group"
            >
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>Schedule Placement Drive</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Row: Department Distribution & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Enrollment Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Department Student Enrollment</span>
            </h3>
            <span className="text-[11px] text-slate-400">Database Live Records</span>
          </div>

          <div className="space-y-3">
            {(analytics?.department_distribution || []).map((dept) => {
              const currentCount = dept.count ?? (dept as any).student_count ?? 0;
              const maxCount = Math.max(1, ...(analytics?.department_distribution || []).map((d) => d.count ?? (d as any).student_count ?? 0));
              const pct = Math.round((currentCount / maxCount) * 100);
              return (
                <div key={dept.department} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">{dept.department}</span>
                    <span className="text-slate-400">{currentCount} students</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security Audit Trail Preview */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Recent Administrative Audit Logs</span>
            </h3>
            <Link href="/admin/audit-logs" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
              Full Logs
            </Link>
          </div>

          {recentLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No recent audit trail entries logged.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 truncate">
                      {log.action} — <span className="text-slate-400 font-normal">{log.resource_type} #{log.resource_id}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      By {log.actor_name} ({log.actor_email}) • IP: {log.ip_address || "internal"}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 shrink-0">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
