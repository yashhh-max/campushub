"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuth } from "@/context/AuthContext";
import { institutionalApi } from "@/lib/institutionalApi";
import { AdminAnalytics } from "@/types/institutional";
import {
  BarChart3,
  Users,
  GraduationCap,
  Calendar,
  Briefcase,
  Award,
  RefreshCw,
  AlertCircle,
  Building,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminAnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await institutionalApi.getAdminAnalytics(token);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load institutional analytics");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <AdminShell requiredPermission="REPORT_VIEW">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Institutional Analytics & Intelligence
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Direct database telemetry: enrollment distributions, event attendance, club memberships, and placement performance.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadAnalytics}
            className="flex items-center gap-1.5 text-xs self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Telemetry
          </Button>
        </div>

        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
            Aggregating real-time database records...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-xs font-semibold bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        ) : !data ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            No institutional telemetry available.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Enrolled Students</span>
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {data.kpis.total_students}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Verified academic accounts</div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Faculty & Staff</span>
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {data.kpis.total_faculty}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Academic instructional staff</div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Events Hosted</span>
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {data.kpis.total_events}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {data.kpis.event_registrations} total student registrations
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Attendance Rate</span>
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {data.kpis.overall_attendance_rate}%
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Verified QR scan attendance</div>
              </div>
            </div>

            {/* Department Student Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Building className="w-4 h-4 text-indigo-500" />
                      Department Student Enrollment
                    </h3>
                    <p className="text-xs text-slate-500">
                      Live enrollment tally across academic engineering branches.
                    </p>
                  </div>
                </div>

                {data.department_distribution.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No department enrollment data recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.department_distribution.map((dept) => {
                      const maxCount = Math.max(
                        ...data.department_distribution.map((d) => d.student_count),
                        1
                      );
                      const pct = Math.round((dept.student_count / maxCount) * 100);
                      return (
                        <div key={dept.code} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {dept.name} ({dept.code})
                            </span>
                            <span className="font-mono text-slate-500 font-bold">
                              {dept.student_count} students
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Placement & Opportunities Activity */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-emerald-500" />
                      TPO Placement Telemetry
                    </h3>
                    <p className="text-xs text-slate-500">
                      Corporate campus recruitment and drive status breakdown.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500 font-medium">Recruiting Companies</div>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {data.kpis.recruiting_companies}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500 font-medium">Placement Drives</div>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {data.kpis.active_placement_drives}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500 font-medium">Active Clubs</div>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {data.kpis.total_clubs}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500 font-medium">Pending Approvals</div>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {data.kpis.pending_approvals}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
