"use client";

import { useState, useEffect, useCallback } from "react";
import { TpoShell } from "@/components/tpo/TpoShell";
import { useAuth } from "@/context/AuthContext";
import { institutionalApi } from "@/lib/institutionalApi";
import { StudentProfile } from "@/types/auth";
import {
  GraduationCap,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  Award,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function TpoStudentsPage() {
  const { token } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [placedFilter, setPlacedFilter] = useState("ALL");
  const [minCgpaFilter, setMinCgpaFilter] = useState("0");
  const [maxBacklogsFilter, setMaxBacklogsFilter] = useState("ALL");

  const loadStudents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await institutionalApi.getTPOStudents(token, {
        search: search || undefined,
        department: deptFilter !== "ALL" ? deptFilter : undefined,
        is_placed: placedFilter !== "ALL" ? placedFilter === "placed" : undefined,
        min_cgpa: parseFloat(minCgpaFilter) > 0 ? parseFloat(minCgpaFilter) : undefined,
        max_backlogs: maxBacklogsFilter !== "ALL" ? parseInt(maxBacklogsFilter, 10) : undefined,
      });
      setStudents(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load candidate master");
    } finally {
      setLoading(false);
    }
  }, [token, search, deptFilter, placedFilter, minCgpaFilter, maxBacklogsFilter]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleExportCSV = () => {
    if (students.length === 0) return;
    const headers = [
      "Roll Number",
      "Full Name",
      "Email",
      "Department",
      "Graduation Year",
      "CGPA",
      "Backlogs",
      "Placement Status",
    ];
    const rows = students.map((s) => [
      `"${s.roll_number || s.student_id || ""}"`,
      `"${s.user?.full_name || ""}"`,
      s.user?.email || "",
      `"${s.department || ""}"`,
      s.graduation_year || "",
      s.cgpa ?? "—",
      s.backlogs ?? 0,
      s.is_placed ? "Placed" : "Seeking Placement",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `KPRIT_TPO_Eligible_Master_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <TpoShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Candidate Placement Master Directory
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Filter prospective recruits by minimum CGPA thresholds, backlog status, branch, and company placement outcomes.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadStudents}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={students.length === 0}
              className="flex items-center gap-1.5 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export TPO Master CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by roll number (e.g. 22K81A0501), candidate name, or email..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Departments</option>
                <option value="Computer Science and Engineering">CSE</option>
                <option value="Electronics and Communication Engineering">ECE</option>
                <option value="CSE (Artificial Intelligence & Machine Learning)">CSM</option>
                <option value="CSE (Data Science)">CSD</option>
                <option value="Electrical and Electronics Engineering">EEE</option>
                <option value="Mechanical Engineering">MECH</option>
                <option value="Civil Engineering">CIVIL</option>
              </select>
            </div>

            <select
              value={placedFilter}
              onChange={(e) => setPlacedFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Placement Statuses</option>
              <option value="placed">Placed Only</option>
              <option value="unplaced">Unplaced (Seeking Offers)</option>
            </select>

            <select
              value={minCgpaFilter}
              onChange={(e) => setMinCgpaFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="0">Min CGPA: Any</option>
              <option value="6.0">Min CGPA: 6.0+</option>
              <option value="6.5">Min CGPA: 6.5+</option>
              <option value="7.0">Min CGPA: 7.0+</option>
              <option value="7.5">Min CGPA: 7.5+</option>
              <option value="8.0">Min CGPA: 8.0+</option>
            </select>

            <select
              value={maxBacklogsFilter}
              onChange={(e) => setMaxBacklogsFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">Backlogs: Any</option>
              <option value="0">0 Active Backlogs (Strict)</option>
              <option value="1">Up to 1 Backlog</option>
              <option value="2">Up to 2 Backlogs</option>
            </select>
          </div>
        </div>

        {/* Student Master Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading candidate master records...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-500 text-xs font-semibold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <GraduationCap className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                No students match this query
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try loosening your CGPA or backlog criteria above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">Hall Ticket / Roll No</th>
                    <th className="py-3.5 px-4">Student Candidate</th>
                    <th className="py-3.5 px-4">Department & Batch</th>
                    <th className="py-3.5 px-4">CGPA</th>
                    <th className="py-3.5 px-4">Backlogs</th>
                    <th className="py-3.5 px-4">Placement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {students.map((s, idx) => (
                    <tr
                      key={s.id ?? s.roll_number ?? s.student_id ?? idx}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-900 dark:text-indigo-400">
                        {s.roll_number || s.student_id || "N/A"}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {s.user?.full_name || "Student"}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {s.user?.email}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {s.department || "General"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Graduating {s.graduation_year || "2026"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>{s.cgpa !== null && s.cgpa !== undefined ? s.cgpa.toFixed(2) : "—"}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {s.backlogs === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            0 (Clear)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {s.backlogs} Active
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {s.is_placed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle className="w-3 h-3" />
                            Placed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            Seeking Placement
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
      </div>
    </TpoShell>
  );
}
