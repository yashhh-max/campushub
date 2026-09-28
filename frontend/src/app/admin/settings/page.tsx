"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuth } from "@/context/AuthContext";
import { institutionalApi } from "@/lib/institutionalApi";
import { SystemSetting } from "@/types/institutional";
import {
  Settings,
  Save,
  Building,
  Calendar,
  Briefcase,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<SystemSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    institution_name: "Kommuri Pratap Reddy Institute of Technology",
    academic_year: "2025-2026",
    current_semester: "Even Semester",
    is_placement_season_active: true,
    is_maintenance_mode: false,
    emergency_notice_banner: "",
  });

  const loadSettings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await institutionalApi.getSystemSettings(token);
      setSettings(data);
      setFormData({
        institution_name: data.institution_name || "Kommuri Pratap Reddy Institute of Technology",
        academic_year: data.academic_year || "2025-2026",
        current_semester: data.current_semester || "Even Semester",
        is_placement_season_active: !!data.is_placement_season_active,
        is_maintenance_mode: !!data.is_maintenance_mode,
        emergency_notice_banner: data.emergency_notice_banner || "",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load system settings");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await institutionalApi.updateSystemSettings(token, formData);
      setSettings(updated);
      setSuccess("Institutional configuration saved successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update system settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell requiredPermission="SYSTEM_SETTINGS">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Institutional System Configuration
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Global parameters for KPRIT: active academic term, placement season toggles, and campus emergency banners.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadSettings}
            className="flex items-center gap-1.5 text-xs self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Reload
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
            Retrieving institutional parameters...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Campus Identity */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Building className="w-4 h-4 text-indigo-500" />
                College Identity & Campus Branding
              </h3>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Institution Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.institution_name}
                  onChange={(e) =>
                    setFormData({ ...formData, institution_name: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Academic Session */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Academic Session & Timelines
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Active Academic Year
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.academic_year}
                    onChange={(e) =>
                      setFormData({ ...formData, academic_year: e.target.value })
                    }
                    placeholder="2025-2026"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Current Semester
                  </label>
                  <select
                    value={formData.current_semester}
                    onChange={(e) =>
                      setFormData({ ...formData, current_semester: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Odd Semester">Odd Semester (I, III, V, VII)</option>
                    <option value="Even Semester">Even Semester (II, IV, VI, VIII)</option>
                    <option value="Summer Term">Summer Term / Vacation</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Operational Toggles */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Briefcase className="w-4 h-4 text-indigo-500" />
                Operational Status & Campus Modes
              </h3>

              {/* Placement Season Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    Campus Placement Season Active
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Enables student applications for corporate recruitment drives and drives on dashboard.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      is_placement_season_active: !formData.is_placement_season_active,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    formData.is_placement_season_active
                      ? "bg-indigo-600"
                      : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                      formData.is_placement_season_active ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Maintenance Mode Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    Maintenance Mode
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Restricts student portal access during semester database updates or roll number rollovers.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      is_maintenance_mode: !formData.is_maintenance_mode,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    formData.is_maintenance_mode
                      ? "bg-rose-600"
                      : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                      formData.is_maintenance_mode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Emergency Banner */}
              <div className="space-y-1 pt-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Campus-Wide Emergency Notice Banner (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.emergency_notice_banner}
                  onChange={(e) =>
                    setFormData({ ...formData, emergency_notice_banner: e.target.value })
                  }
                  placeholder="e.g. Campus closed tomorrow due to heavy rainfall advisory by TS Government."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={saving}
                className="flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving Configuration..." : "Save System Settings"}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </AdminShell>
  );
}
