"use client";

import { useEffect, useState } from "react";
import {
  GraduationCap,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import { fetchSystemHealth } from "@/lib/api";
import { SystemHealth } from "@/types/campus";

export function Footer() {
  const [health, setHealth] = useState<SystemHealth>({ status: "checking" });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const performCheck = async () => {
    setIsRefreshing(true);
    try {
      const result = await fetchSystemHealth();
      setHealth(result);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      performCheck();
    }, 0);

    const interval = setInterval(() => {
      performCheck();
    }, 30000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const getStatusDisplay = () => {
    if (health.status === "checking") {
      return {
        color: "bg-amber-400 animate-pulse",
        text: "Checking backend...",
      };
    }
    if (health.status === "healthy") {
      return {
        color: "bg-emerald-500",
        text: `Backend: Operational (DB: ${health.database})`,
      };
    }
    if (health.status === "degraded") {
      return {
        color: "bg-amber-500",
        text: `Backend Degraded (${health.database})`,
      };
    }
    return {
      color: "bg-rose-500",
      text: "Backend Offline (Port 8000)",
    };
  };

  const statusInfo = getStatusDisplay();

  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1: Brand & Health Status */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-sm">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">
                CampusHub
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
              The unified collegiate experience platform for discovering campus events, exploring verified student organizations, and staying current with official academic notices.
            </p>

            {/* Live Backend System Health Pill */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <div className="relative flex items-center justify-center">
                  <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.color}`} />
                  {health.status === "healthy" && (
                    <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {statusInfo.text}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    API v{health.version || "1.0.0"} • Next.js + Django DRF
                  </span>
                </div>
                <button
                  type="button"
                  onClick={performCheck}
                  disabled={isRefreshing}
                  className="ml-1 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  title="Refresh backend status"
                  aria-label="Refresh backend status"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-500" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Platform Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Explore Campus
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a href="#events" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Upcoming Events
                </a>
              </li>
              <li>
                <a href="#clubs" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Student Organizations
                </a>
              </li>
              <li>
                <a href="#announcements" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Official Announcements
                </a>
              </li>
              <li>
                <a href="#community" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Student Voices
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Tech Stack & Architecture */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Architecture & Docs
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Next.js 15 (App Router)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Django REST Framework</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span>PostgreSQL 16 Database</span>
              </li>
              <li className="pt-1">
                <span className="text-xs text-slate-500">Phase 1: Foundation & Landing</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} CampusHub. Engineered for college communities. Portfolio Ready.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              REST API CORS Configured
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              JWT Auth Ready
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
