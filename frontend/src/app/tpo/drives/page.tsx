"use client";

import { useState, useEffect, useCallback } from "react";
import { TpoShell } from "@/components/tpo/TpoShell";
import { useAuth } from "@/context/AuthContext";
import { institutionalApi } from "@/lib/institutionalApi";
import {
  PlacementDrive,
  Company,
  PlacementApplication,
} from "@/types/institutional";
import {
  Calendar,
  Building2,
  Award,
  Users,
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  Clock,
  X,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function TpoDrivesPage() {
  const { token } = useAuth();
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Drive Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company_id: "",
    title: "",
    job_role: "",
    package_details: "",
    location: "Hyderabad / Bangalore",
    drive_date: "",
    registration_deadline: "",
    min_cgpa: 6.5,
    max_backlogs: 0,
    eligibility_departments: "CSE, ECE, CSM, CSD",
    eligibility_graduation_year: 2026,
    selection_process: "Online Assessment -> Technical Interview -> HR Round",
  });

  // View Applications Drawer
  const [selectedDrive, setSelectedDrive] = useState<PlacementDrive | null>(null);
  const [applications, setApplications] = useState<PlacementApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [drivesData, companiesData] = await Promise.all([
        institutionalApi.getPlacementDrives(token, {
          search: search || undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
        }),
        institutionalApi.getCompanies(token),
      ]);
      setDrives(drivesData);
      setCompanies(companiesData);
      if (companiesData.length > 0 && !formData.company_id) {
        setFormData((prev) => ({ ...prev, company_id: String(companiesData[0].id) }));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load placement drives");
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, formData.company_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !formData.company_id) return;
    setCreating(true);
    setCreateError(null);

    try {
      await institutionalApi.createPlacementDrive(token, {
        company: parseInt(formData.company_id, 10),
        title: formData.title,
        job_role: formData.job_role,
        package_details: formData.package_details,
        location: formData.location,
        drive_date: new Date(formData.drive_date).toISOString(),
        application_deadline: new Date(formData.registration_deadline).toISOString(),
        registration_deadline: new Date(formData.registration_deadline).toISOString(),
        eligibility_min_cgpa: Number(formData.min_cgpa),
        min_cgpa: Number(formData.min_cgpa),
        eligibility_max_backlogs: Number(formData.max_backlogs),
        max_backlogs: Number(formData.max_backlogs),
        eligibility_departments: formData.eligibility_departments.split(",").map((s) => s.trim()),
        eligibility_graduation_year: Number(formData.eligibility_graduation_year),
        selection_process: formData.selection_process,
      });

      setIsCreateOpen(false);
      loadData();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create drive");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenApplications = async (drive: PlacementDrive) => {
    if (!token) return;
    setSelectedDrive(drive);
    setLoadingApps(true);
    try {
      const data = await institutionalApi.getPlacementApplications(token, {
        drive_id: drive.id,
      });
      setApplications(data);
    } catch {
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  };

  const handleUpdateAppStatus = async (appId: number, newStatus: string) => {
    if (!token) return;
    try {
      await institutionalApi.updateApplicationStatus(token, appId, newStatus);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  return (
    <TpoShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Campus Placement Drives & Eligibility Rules
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure corporate recruitment schedules, eligibility criteria (CGPA, backlogs, branch), and student applicants.
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
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 text-xs shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Placement Drive
            </Button>
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
              placeholder="Search by drive title, company, or job role..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Drive Statuses</option>
            <option value="active">Active</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Drives List */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            Loading recruitment drives...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-xs font-semibold bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        ) : drives.length === 0 ? (
          <div className="p-12 text-center space-y-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">
              No placement drives scheduled
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Schedule your first company recruitment drive to begin receiving student applications.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
              const deadline = d.application_deadline || d.registration_deadline;
              const branches = Array.isArray(d.eligibility_departments)
                ? d.eligibility_departments.join(", ")
                : d.eligibility_departments || "All Branches";

              return (
                <div
                  key={d.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          <Building2 className="w-4 h-4" />
                          <span>{companyName}</span>
                        </div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                          {d.title}
                        </h3>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {d.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-3">
                      <Award className="w-3.5 h-3.5" />
                      <span>Package: {pkg}</span>
                      <span className="text-slate-400 font-normal">• {d.job_role}</span>
                    </div>

                    {/* Eligibility Rules Container */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs mb-3">
                      <div className="font-bold text-[11px] text-slate-500 uppercase tracking-wider">
                        Eligibility Rules (Database Enforced)
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300 text-[11px]">
                        <div>
                          Min CGPA: <span className="font-bold">{minCgpa}</span>
                        </div>
                        <div>
                          Max Backlogs: <span className="font-bold">{maxBacklogs}</span>
                        </div>
                        <div className="col-span-2">
                          Target Branches:{" "}
                          <span className="font-bold text-slate-900 dark:text-white">
                            {branches}
                          </span>
                        </div>
                        {d.eligibility_graduation_year && (
                          <div>
                            Batch: <span className="font-bold">{d.eligibility_graduation_year}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-500">
                      {d.drive_date && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Drive Date: {new Date(d.drive_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {deadline && (
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Apply Deadline: {new Date(deadline).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-bold text-slate-900 dark:text-white">
                        {d.applications_count ?? 0}
                      </span>{" "}
                      Registered Applicants
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenApplications(d)}
                      className="text-xs flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Review Candidates
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Schedule Placement Drive */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in-50 duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Schedule Placement Drive
                    </h2>
                    <p className="text-xs text-slate-500">
                      Specify company details and database eligibility thresholds.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {createError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateDrive} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Recruiting Company *
                  </label>
                  <select
                    required
                    value={formData.company_id}
                    onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.tier})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Drive Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Darwinbox Campus Hiring 2026"
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Job Designation *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.job_role}
                      onChange={(e) => setFormData({ ...formData, job_role: e.target.value })}
                      placeholder="e.g. Member of Technical Staff"
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Package / CTC *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.package_details}
                      onChange={(e) => setFormData({ ...formData, package_details: e.target.value })}
                      placeholder="e.g. 16.3 LPA (12L Fixed + 4.3L Stocks)"
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Job Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Hyderabad / Bangalore"
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Eligibility Rules Section */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 block">
                    Automated Eligibility Thresholds (Strictly Enforced)
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Min CGPA
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        required
                        value={formData.min_cgpa}
                        onChange={(e) => setFormData({ ...formData, min_cgpa: parseFloat(e.target.value) })}
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Max Backlogs
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        required
                        value={formData.max_backlogs}
                        onChange={(e) => setFormData({ ...formData, max_backlogs: parseInt(e.target.value, 10) })}
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    <div className="col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Eligible Branches
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.eligibility_departments}
                        onChange={(e) => setFormData({ ...formData, eligibility_departments: e.target.value })}
                        placeholder="CSE, ECE, CSM, CSD"
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Drive Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.drive_date}
                      onChange={(e) => setFormData({ ...formData, drive_date: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Registration Deadline *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.registration_deadline}
                      onChange={(e) => setFormData({ ...formData, registration_deadline: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={creating}
                  >
                    {creating ? "Scheduling..." : "Schedule Drive"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal / Drawer: Review Candidate Applications */}
        {selectedDrive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in-50 duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Candidate Roster: {selectedDrive.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedDrive.company_name || "Corporate Partner"} • Min CGPA: {selectedDrive.eligibility_min_cgpa ?? selectedDrive.min_cgpa} • Max Backlogs: {selectedDrive.eligibility_max_backlogs ?? selectedDrive.max_backlogs}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDrive(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingApps ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  Loading candidate applications...
                </div>
              ) : applications.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                    No student applications yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Students meeting the database eligibility requirements will appear here once registered.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-2.5 px-3">Candidate</th>
                        <th className="py-2.5 px-3">Branch</th>
                        <th className="py-2.5 px-3">CGPA</th>
                        <th className="py-2.5 px-3">Backlogs</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Review Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {applications.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                            <div>{app.student_name || "Candidate"}</div>
                            <div className="font-mono text-[10px] text-slate-400">
                              {app.student_roll || app.student_email}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {app.student_dept || "Engineering"}
                          </td>

                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            {app.student_cgpa ?? "—"}
                          </td>

                          <td className="py-2.5 px-3">
                            {app.student_backlogs === 0 ? (
                              <span className="text-emerald-600 font-semibold">0</span>
                            ) : (
                              <span className="text-rose-500 font-semibold">{app.student_backlogs}</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {app.status}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <select
                              value={app.status}
                              onChange={(e) => handleUpdateAppStatus(app.id, e.target.value)}
                              className="px-2 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
                            >
                              <option value="APPLIED">Applied</option>
                              <option value="SHORTLISTED">Shortlist</option>
                              <option value="INTERVIEW_SCHEDULED">Interview</option>
                              <option value="OFFERED">Offer (Placed)</option>
                              <option value="REJECTED">Reject</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </TpoShell>
  );
}
