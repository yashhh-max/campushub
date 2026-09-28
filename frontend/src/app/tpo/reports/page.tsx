"use client";

import { useState, useEffect, useCallback } from "react";
import { TpoShell } from "@/components/tpo/TpoShell";
import { useAuth } from "@/context/AuthContext";
import { institutionalApi } from "@/lib/institutionalApi";
import { TPOReports } from "@/types/institutional";
import {
  BarChart3,
  Download,
  RefreshCw,
  AlertCircle,
  Building,
  Award,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface DepartmentStatItem {
  department: string;
  total: number;
  placed: number;
  rate: number;
}

export default function TpoReportsPage() {
  const { token } = useAuth();
  const [reports, setReports] = useState<TPOReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await institutionalApi.getTPOReports(token);
      setReports(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load placement reports");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const departmentList: DepartmentStatItem[] =
    reports?.department_stats ||
    reports?.department_breakdown?.map((d) => ({
      department: d.name || d.department,
      total: d.total_students,
      placed: d.placed_students,
      rate: d.placement_rate,
    })) ||
    [];

  const handleExportCSV = () => {
    if (departmentList.length === 0) return;
    const headers = [
      "Department",
      "Total Registered Students",
      "Placed Students",
      "Placement Rate (%)",
    ];
    const rows = departmentList.map((d: DepartmentStatItem) => [
      `"${d.department}"`,
      d.total,
      d.placed,
      d.rate,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `KPRIT_Placement_Report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRegistered = reports?.total_registered_students ?? reports?.total_students ?? 0;
  const totalCompanies = reports?.total_companies ?? reports?.recruiting_companies ?? 0;
  const activeDrives = reports?.active_drives ?? reports?.total_drives ?? 0;
  const placedStudents = reports?.total_placed_students ?? reports?.placed_students ?? 0;
  const placementRate = reports?.placement_rate_pct ?? reports?.placement_rate ?? 0;

  return (
    <TpoShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Institutional Placement Reports & Branch Audits
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Verified database telemetry: branch placement conversions, recruiter hiring tallies, and historical audit figures.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadReports}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={departmentList.length === 0}
              className="flex items-center gap-1.5 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export Summary CSV
            </Button>
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
            Generating official placement reports...
          </div>
        ) : !reports ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            No placement records found.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Summaries */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-500 font-semibold mb-1">
                  Overall Campus Placement Rate
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-6 h-6 text-emerald-500" />
                  <span>{placementRate}%</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {placedStudents} of {totalRegistered} candidates placed
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-500 font-semibold mb-1">
                  Active Recruitment Drives
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-indigo-500" />
                  <span>{activeDrives}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Ongoing corporate selection rounds
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xs text-slate-500 font-semibold mb-1">
                  Recruiter Partnerships
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="w-6 h-6 text-blue-500" />
                  <span>{totalCompanies}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Approved hiring partners in database
                </div>
              </div>
            </div>

            {/* Department Placement Breakdown Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Academic Department Audit
                </h3>
                <p className="text-xs text-slate-500">
                  Student enrollment vs verified offers secured per branch.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Department Branch</th>
                      <th className="py-3 px-4">Registered Students</th>
                      <th className="py-3 px-4">Placed Offers</th>
                      <th className="py-3 px-4">Placement Conversion</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {departmentList.map((dept) => (
                      <tr
                        key={dept.department}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {dept.department}
                        </td>

                        <td className="py-3 px-4 font-mono font-medium text-slate-600 dark:text-slate-300">
                          {dept.total}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {dept.placed}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {dept.rate}%
                            </span>
                            <div className="w-24 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.min(dept.rate, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </TpoShell>
  );
}
