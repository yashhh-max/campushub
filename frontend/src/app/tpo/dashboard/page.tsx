"use client";

import { useState, useEffect, useCallback } from "react";
import { TpoShell } from "@/components/tpo/TpoShell";
import { useAuth } from "@/context/AuthContext";
import { institutionalApi } from "@/lib/institutionalApi";
import { TPOReports, PlacementDrive } from "@/types/institutional";
import {
  Briefcase,
  Building2,
  Calendar,
  GraduationCap,
  Award,
  RefreshCw,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function TpoDashboardPage() {
  const { token } = useAuth();
  const [reports, setReports] = useState<TPOReports | null>(null);
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [reportsData, drivesData] = await Promise.all([
        institutionalApi.getTPOReports(token),
        institutionalApi.getPlacementDrives(token),
      ]);
      setReports(reportsData);
      setDrives(drivesData.slice(0, 5));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load TPO dashboard telemetry");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalRegistered = reports?.total_registered_students ?? reports?.total_students ?? 0;
  const totalCompanies = reports?.total_companies ?? reports?.recruiting_companies ?? 0;
  const activeDrives = reports?.active_drives ?? reports?.total_drives ?? 0;
  const placedStudents = reports?.total_placed_students ?? reports?.placed_students ?? 0;
  const placementRate = reports?.placement_rate_pct ?? reports?.placement_rate ?? 0;

  const departmentList =
    reports?.department_breakdown?.map((d) => ({
      name: d.name || d.department,
      placed: d.placed_students,
      total: d.total_students,
      rate: d.placement_rate,
    })) ||
    reports?.department_stats?.map((d) => ({
      name: d.department,
      placed: d.placed,
      total: d.total,
      rate: d.rate,
    })) ||
    [];

  return (
    <TpoShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              KPRIT Placement Command Center
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Live corporate drive telemetry, candidate eligibility rules, and real-time placement statistics.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/tpo/drives">
              <Button variant="primary" size="sm" className="flex items-center gap-1.5 text-xs shadow-md shadow-indigo-600/20">
                <Plus className="w-3.5 h-3.5" />
                New Placement Drive
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
            Retrieving placement data from database...
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Recruiter Partners</span>
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {totalCompanies}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Verified hiring corporate partners</div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Active Drives</span>
                  <Calendar className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {activeDrives}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Ongoing campus recruitment rounds</div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Offers Secured</span>
                  <Award className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {placedStudents}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {placementRate}% Placement Rate
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Candidate Pool</span>
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {totalRegistered}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Total registered students</div>
              </div>
            </div>

            {/* Quick Actions and Drive Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Active Drives Table */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      Active Recruitment Drives
                    </h3>
                    <p className="text-xs text-slate-500">
                      Recent placement drives with eligibility thresholds.
                    </p>
                  </div>
                  <Link
                    href="/tpo/drives"
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>View All Drives</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {drives.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No active placement drives scheduled yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {drives.map((d) => {
                      const companyName =
                        d.company_name ||
                        (typeof d.company === "object" && d.company !== null
                          ? d.company.name
                          : "Corporate Partner");
                      const pkg =
                        d.package_details ||
                        (d.package_lpa ? `${d.package_lpa} LPA` : "Competitive CTC");
                      const minCgpa = d.eligibility_min_cgpa ?? d.min_cgpa ?? 6.0;
                      const maxBacklogs = d.eligibility_max_backlogs ?? d.max_backlogs ?? 0;

                      return (
                        <div
                          key={d.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white text-sm">
                              {d.title}
                            </div>
                            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                              {companyName} • {pkg}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                              <span>Min CGPA: {minCgpa}</span>
                              <span>• Max Backlogs: {maxBacklogs}</span>
                              <span>• Target Batch: {d.eligibility_graduation_year || "All"}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {d.status.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold">
                              {d.applications_count ?? 0} Applied
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Department Statistics Summary */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Branch-Wise Placement Rates
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live database counts by academic engineering department.
                  </p>
                </div>

                {departmentList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No branch placement records recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {departmentList.map((dept) => (
                      <div key={dept.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {dept.name}
                          </span>
                          <span className="font-mono text-slate-500 font-bold">
                            {dept.placed}/{dept.total} ({dept.rate}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${Math.min(dept.rate, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </TpoShell>
  );
}
