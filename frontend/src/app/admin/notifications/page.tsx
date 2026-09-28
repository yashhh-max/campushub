"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuth } from "@/context/AuthContext";
import { institutionalApi } from "@/lib/institutionalApi";
import {
  Bell,
  Send,
  Users,
  Building,
  GraduationCap,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

type TargetAudience =
  | "ALL_STUDENTS"
  | "DEPARTMENT"
  | "YEAR"
  | "SECTION"
  | "CLUB"
  | "FACULTY"
  | "TPO_APPLICANTS";

export default function AdminNotificationsPage() {
  const { token } = useAuth();
  const [audience, setAudience] = useState<TargetAudience>("ALL_STUDENTS");
  const [department, setDepartment] = useState("Computer Science and Engineering");
  const [year, setYear] = useState<number>(3);
  const [section, setSection] = useState("A");
  const [clubId, setClubId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [notifType, setNotifType] = useState("announcement");
  const [linkUrl, setLinkUrl] = useState("");

  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSending(true);
    setStatusMessage(null);

    try {
      const res = await institutionalApi.broadcastNotification(token, {
        target_audience: audience,
        target_department: audience === "DEPARTMENT" || audience === "SECTION" ? department : undefined,
        target_year: audience === "YEAR" || audience === "SECTION" ? year : undefined,
        target_section: audience === "SECTION" ? section : undefined,
        target_club_id: audience === "CLUB" && clubId ? parseInt(clubId, 10) : undefined,
        title,
        message,
        notification_type: notifType,
        link_url: linkUrl || undefined,
      });

      setStatusMessage({
        type: "success",
        text: `Targeted broadcast successfully dispatched to ${res.sent_count} campus recipients.`,
      });
      setTitle("");
      setMessage("");
      setLinkUrl("");
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to dispatch broadcast notice.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminShell requiredPermission="ANNOUNCEMENT_CREATE">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Targeted Broadcast Notifications
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dispatch high-priority institutional alerts, academic cohort notifications, or placement announcements.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-4 rounded-2xl flex items-center gap-2.5 text-xs font-semibold border ${
              statusMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Dispatch Form */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
            <form onSubmit={handleSendBroadcast} className="space-y-5">
              {/* Audience Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Recipient Cohort *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: "ALL_STUDENTS", label: "All Students", icon: Users },
                    { value: "DEPARTMENT", label: "Department", icon: Building },
                    { value: "YEAR", label: "Class / Year", icon: GraduationCap },
                    { value: "SECTION", label: "Specific Section", icon: Calendar },
                    { value: "FACULTY", label: "Faculty Only", icon: Briefcase },
                    { value: "TPO_APPLICANTS", label: "TPO Applicants", icon: Briefcase },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setAudience(item.value as TargetAudience)}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          audience === item.value
                            ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-600 text-indigo-900 dark:text-indigo-200 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-300"
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-2 text-indigo-500" />
                        <span className="text-xs font-bold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conditional Filters based on Audience */}
              {(audience === "DEPARTMENT" || audience === "SECTION") && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Computer Science and Engineering">Computer Science (CSE)</option>
                    <option value="Electronics and Communication Engineering">ECE</option>
                    <option value="CSE (Artificial Intelligence & Machine Learning)">CSM</option>
                    <option value="CSE (Data Science)">CSD</option>
                    <option value="Electrical and Electronics Engineering">EEE</option>
                    <option value="Mechanical Engineering">MECH</option>
                    <option value="Civil Engineering">CIVIL</option>
                  </select>
                </div>
              )}

              {(audience === "YEAR" || audience === "SECTION") && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Academic Year
                    </label>
                    <select
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value, 10))}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value={1}>1st Year (Fresher)</option>
                      <option value={2}>2nd Year (Sophomore)</option>
                      <option value={3}>3rd Year (Junior)</option>
                      <option value={4}>4th Year (Senior / Final)</option>
                    </select>
                  </div>

                  {audience === "SECTION" && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Section
                      </label>
                      <input
                        type="text"
                        value={section}
                        onChange={(e) => setSection(e.target.value.toUpperCase())}
                        placeholder="e.g. A, B, or C"
                        className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white uppercase font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Title & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Notification Headline *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Mid-Term Examination Schedule Released"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Category Type *
                  </label>
                  <select
                    value={notifType}
                    onChange={(e) => setNotifType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="announcement">Announcement</option>
                    <option value="event_rsvp">Event Alert</option>
                    <option value="club_post">Club Notice</option>
                    <option value="academic">Academic Update</option>
                  </select>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Message Content *
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type clear instructions, venue details, or links for students..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Action Link */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Call to Action Link (Optional)
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="/events or /tpo/drives/1"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? "Broadcasting..." : "Dispatch Targeted Broadcast"}</span>
              </Button>
            </form>
          </div>

          {/* Info Card / Preview */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-500" />
                Student Device Preview
              </h3>
              <p className="text-xs text-slate-500">
                This shows how the targeted alert will render in the student notification drawer.
              </p>

              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {notifType} • Instant Alert
                  </span>
                  <span className="text-[10px] text-slate-400">Just now</span>
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {title || "Notice Headline Preview"}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {message || "Your message body will be displayed directly to the targeted recipient group."}
                </p>
                {linkUrl && (
                  <div className="text-[10px] font-mono text-indigo-600 truncate">
                    Link: {linkUrl}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-xs text-slate-500 space-y-2">
              <div className="font-bold text-slate-700 dark:text-slate-300">Institutional Delivery Rules:</div>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Broadcasts are immediately logged into the college audit log.</li>
                <li>Notifications appear in the student bell dropdown in real-time.</li>
                <li>Audience targeting avoids spamming unrelated branches or batches.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
