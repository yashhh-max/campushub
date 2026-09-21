"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  Sparkles,
  Users,
  Mail,
  Check,
  ArrowLeft,
  Settings,
  ShieldCheck,
  Save,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/api";
import { NotificationPreference } from "@/types/campus";

export default function NotificationPreferencesPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();


  const [preferences, setPreferences] = useState<NotificationPreference>({
    announcements: true,
    event_reminders: true,
    rsvp_updates: true,
    waitlist_promotions: true,
    club_activity: true,
    email_notifications: true,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/dashboard/settings/notifications");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        setLoading(true);
        const data = await fetchNotificationPreferences(token);
        setPreferences(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load preferences.");
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated && token) {
      load();
    }
  }, [isAuthenticated, token]);

  const handleToggle = (key: keyof NotificationPreference) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await updateNotificationPreferences(preferences, token);
      setPreferences(updated);
      setSuccessMessage("Preferences saved successfully!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const PREFERENCE_ITEMS = [
    {
      key: "announcements" as keyof NotificationPreference,
      title: "Campus Announcements",
      description: "Urgent alerts, university administration notices, and targeted department bulletins.",
      icon: Bell,
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40",
    },
    {
      key: "event_reminders" as keyof NotificationPreference,
      title: "Event Reminders",
      description: "Timely alerts 24 hours and 1 hour before scheduled events you have RSVP'd for.",
      icon: Calendar,
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40",
    },
    {
      key: "rsvp_updates" as keyof NotificationPreference,
      title: "RSVP Confirmations",
      description: "Instant confirmation when your event registrations or waitlist requests are processed.",
      icon: ShieldCheck,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40",
    },
    {
      key: "waitlist_promotions" as keyof NotificationPreference,
      title: "Waitlist Promotions",
      description: "Immediate alert when a seat opens up and you are automatically promoted to confirmed attendee.",
      icon: Sparkles,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      key: "club_activity" as keyof NotificationPreference,
      title: "Club Community & Applications",
      description: "Membership approval notices, club announcements, and new community discussion posts.",
      icon: Users,
      color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40",
    },
    {
      key: "email_notifications" as keyof NotificationPreference,
      title: "Email Notifications",
      description: "Receive mirrored notification digests and urgent alerts directly at your university email address.",
      icon: Mail,
      color: "text-rose-500 bg-rose-50 dark:bg-rose-950/40",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/notifications"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Notification Center</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Notification Preferences
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Choose the categories of alerts you want to receive in-app and via email.
              </p>
            </div>
          </div>
        </div>

        {/* Feedback alerts */}
        {successMessage && (
          <div
            id="preferences-success-alert"
            className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in-50"
          >
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Settings List */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Loading your preferences...
            </div>
          ) : (
            PREFERENCE_ITEMS.map((item) => {
              const Icon = item.icon;
              const isEnabled = Boolean(preferences[item.key]);

              return (
                <div
                  key={item.key}
                  className="p-5 sm:p-6 flex items-start justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-2xl ${item.color} shrink-0 mt-0.5`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Accessible Switch Toggle */}
                  <button
                    id={`toggle-${item.key}`}
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    onClick={() => handleToggle(item.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                      isEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            id="save-preferences-btn"
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Preferences"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
