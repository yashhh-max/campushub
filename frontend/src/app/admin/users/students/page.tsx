"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuth } from "@/context/AuthContext";
import { institutionalApi } from "@/lib/institutionalApi";
import { StudentProfile } from "@/types/auth";
import {
  GraduationCap,
  Search,
  Filter,
  Download,
  AlertCircle,
  RefreshCw,
  Award,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminStudentsPage() {
  const { token } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [yearFilter, setYearFilter] = useState<string>("ALL");
  const [placedFilter, setPlacedFilter] = useState<string>("ALL");

  const loadStudents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await institutionalApi.getStudents(token, {
        search: search || undefined,
        department: deptFilter !== "ALL" ? deptFilter : undefined,
        year: yearFilter !== "ALL" ? parseInt(yearFilter, 10) : undefined,
      });
      let filtered = data;
      if (placedFilter === "placed") {
        filtered = filtered.filter((s) => s.is_placed);
      } else if (placedFilter === "unplaced") {
        filtered = filtered.filter((s) => !s.is_placed);
      }
      setStudents(filtered);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load student registry");
    } finally {
      setLoading(false);
    }
  }, [token, search, deptFilter, yearFilter, placedFilter]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleExportCSV = () => {
    if (students.length === 0) return;
    const headers = [
      "Roll Number",
      "Name",
      "Email",
      "Department",
      "Year",
      "Section",
      "CGPA",
      "Backlogs",
      "Placement Status",
    ];
    const rows = students.map((s) => [
      `"${s.roll_number || s.student_id || ""}"`,
      `"${s.user?.full_name || ""}"`,
      s.user?.email || "",
      `"${s.department || ""}"`,
      s.year_of_study || "",
      s.section || "",
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
      `KPRIT_Student_Registry_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminShell requiredPermission="USER_VIEW">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Student Academic Registry
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Live repository of enrolled KPRIT students, academic metrics, CGPA standing, and placement records.
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
              Export Roster CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by roll number (e.g. 22K81A0501), name, or email..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
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
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>

            <select
              value={placedFilter}
              onChange={(e) => setPlacedFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">Placement Status</option>
              <option value="placed">Placed</option>
              <option value="unplaced">Seeking Placement</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading student roster...
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
                No student profiles found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No enrolled students match your filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">Hall Ticket / Roll No</th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Dept & Batch</th>
                    <th className="py-3.5 px-4">CGPA</th>
                    <th className="py-3.5 px-4">Backlogs</th>
                    <th className="py-3.5 px-4">Placement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
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
                          {s.user?.full_name || "Enrolled Student"}
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
                          Year {s.year_of_study || 1} {s.section ? `• Sec ${s.section}` : ""}{" "}
                          {s.graduation_year ? `• Batch of ${s.graduation_year}` : ""}
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
                            Clear (0)
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
    </AdminShell>
  );
}
