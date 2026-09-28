"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Briefcase,
  Building2,
  Calendar,
  Bell,
  Sparkles,
  CheckSquare,
  Send,
  BarChart3,
  Shield,
  Settings,
  ChevronRight,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Award,
  FileText,
} from "lucide-react";
import { getRoleBadgeStyle, isInstitutionalAdmin } from "@/lib/rbac";
import { fetchApprovalRequests } from "@/lib/institutionalApi";

interface AdminShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  requiredPermission?: string;
}

export function AdminShell({
  children,
  title,
  subtitle,
  actions,
  requiredPermission,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  useEffect(() => {
    if (token) {
      fetchApprovalRequests(token, { status: "pending" })
        .then((res) => {
          setPendingApprovalsCount(res.length);
        })
        .catch(() => {});
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Verifying KPRIT institutional credentials...</span>
        </div>
      </div>
    );
  }

  // Permission Guard
  if (!isAuthenticated || !isInstitutionalAdmin(user)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Institutional Access Restricted</h2>
          <p className="text-sm text-slate-400 mb-6">
            The KPRIT Institutional Administration console requires administrative privileges. You are currently logged in as a{" "}
            <span className="text-slate-200 font-semibold">{user?.role || "guest"}</span>.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/dashboard"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors text-center"
            >
              Return to Student Portal
            </Link>
            <button
              onClick={() => logout().then(() => router.push("/login"))}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const roleBadge = getRoleBadgeStyle(user?.role || "student");

  const NAV_SECTIONS = [
    {
      heading: "Overview",
      items: [
        { label: "Admin Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        {
          label: "Approval Center",
          href: "/admin/approvals",
          icon: CheckSquare,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
          badgeColor: "bg-amber-500 text-slate-950 font-bold",
        },
        { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      ],
    },
    {
      heading: "Users & Academics",
      items: [
        { label: "User Management", href: "/admin/users", icon: Users },
        { label: "Students Registry", href: "/admin/users/students", icon: GraduationCap },
        { label: "Faculty Directory", href: "/admin/users/faculty", icon: Award },
        { label: "Departments", href: "/admin/departments", icon: Building2 },
      ],
    },
    {
      heading: "Campus Life",
      items: [
        { label: "Clubs & Societies", href: "/admin/clubs", icon: Users },
        { label: "Event Operations", href: "/admin/events", icon: Calendar },
        { label: "Campus Notices", href: "/admin/announcements", icon: Bell },
        { label: "Opportunity Hub", href: "/admin/opportunities", icon: Sparkles },
      ],
    },
    {
      heading: "TPO & Career",
      items: [
        { label: "TPO Dashboard", href: "/tpo/dashboard", icon: Briefcase },
        { label: "Recruiting Companies", href: "/tpo/companies", icon: Building2 },
        { label: "Placement Drives", href: "/tpo/drives", icon: Calendar },
        { label: "Placement Reports", href: "/tpo/reports", icon: FileText },
      ],
    },
    {
      heading: "System & Governance",
      items: [
        { label: "Targeted Notices", href: "/admin/notifications", icon: Send },
        { label: "Security Audit Logs", href: "/admin/audit-logs", icon: Shield },
        { label: "System Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
            K
          </div>
          <div>
            <div className="font-bold text-sm text-white leading-none">KPRIT Administration</div>
            <div className="text-[10px] text-slate-400">Institutional Portal</div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-slate-900/95 border-r border-slate-800/80 flex flex-col z-50 backdrop-blur-xl transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Institutional Branding */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-blue-600 flex items-center justify-center text-white font-extrabold text-base shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                KPRIT <span className="text-indigo-400 font-semibold text-xs tracking-normal">Institutional</span>
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-[170px]">
                Kommuri Pratap Reddy Inst.
              </div>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Admin User Profile Summary */}
        <div className="px-5 py-3.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="text-xs font-semibold text-slate-200 truncate">{user?.full_name || user?.email}</div>
            <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 ${roleBadge.className}`}>
            {roleBadge.label}
          </span>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-5 custom-scrollbar">
          {NAV_SECTIONS.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {sec.heading}
              </div>
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${item.badgeColor || "bg-indigo-500/20 text-indigo-400"}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Switcher & Logout */}
        <div className="p-3 border-t border-slate-800/80 space-y-1.5">
          <Link
            href="/dashboard"
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Switch to Student View</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </Link>
          <button
            onClick={() => logout().then(() => router.push("/login"))}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* Main Administrative Workspace */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Institutional Header (rendered when title is provided) */}
        {title && (
          <header className="px-6 py-5 bg-slate-900/60 border-b border-slate-800/80 sticky top-0 z-30 backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold mb-1">
                <span>KPRIT Portal</span>
                <span>/</span>
                <span className="text-slate-400 capitalize">{pathname.split("/")[1] || "Admin"}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{title}</h1>
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
          </header>
        )}

        {/* Page Content Body */}
        <div className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
