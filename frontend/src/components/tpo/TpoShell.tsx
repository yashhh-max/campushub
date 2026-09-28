"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isTPOAdmin, getRoleBadgeStyle } from "@/lib/rbac";
import {
  Briefcase,
  Building2,
  Calendar,
  GraduationCap,
  Award,
  BarChart3,
  LogOut,
  ArrowLeft,
  Shield,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface TpoShellProps {
  children: ReactNode;
}

const TPO_NAV_ITEMS = [
  { label: "TPO Dashboard", href: "/tpo/dashboard", icon: Layers },
  { label: "Recruiting Companies", href: "/tpo/companies", icon: Building2 },
  { label: "Placement Drives", href: "/tpo/drives", icon: Calendar },
  { label: "Student Master", href: "/tpo/students", icon: GraduationCap },
  { label: "Placement & Internships", href: "/tpo/opportunities", icon: Award },
  { label: "Placement Reports", href: "/tpo/reports", icon: BarChart3 },
];

export function TpoShell({ children }: TpoShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (!isTPOAdmin(user)) {
        router.push("/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, user, router, pathname]);

  if (isLoading || !isAuthenticated || !isTPOAdmin(user)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">
            Verifying KPRIT TPO Credentials & Permissions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
      {/* TPO Sidebar */}
      <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-900 via-indigo-900 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-900/20">
              <Briefcase className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                KPRIT <span className="text-indigo-600 dark:text-indigo-400">TPO Console</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Training & Placement Cell
              </div>
            </div>
          </div>

          {/* User Badge */}
          <div className="p-4 mx-3 my-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {user?.full_name || user?.email}
              </span>
              <span
                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${getRoleBadgeStyle(
                  user?.role || "TPO_ADMIN"
                )}`}
              >
                {user?.role?.replace(/_/g, " ")}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate">{user?.email}</div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {TPO_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/tpo" && item.href !== "/tpo/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {user?.role && ["SUPER_ADMIN", "COLLEGE_ADMIN"].includes(user.role) && (
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Shield className="w-4 h-4 text-indigo-500" />
              <span>Admin Portal</span>
            </Link>
          )}

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Student View</span>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full flex items-center justify-start gap-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
