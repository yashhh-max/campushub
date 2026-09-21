"use client";

import Link from "next/link";
import { Compass, Calendar, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-md w-full text-center py-12">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-6">
          <Compass className="w-3.5 h-3.5" />
          <span>Error 404 • Page Not Found</span>
        </div>

        {/* Big visual number */}
        <h1 className="text-7xl sm:text-8xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
          <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-500 bg-clip-text text-transparent">
            404
          </span>
        </h1>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
          This campus page doesn&apos;t exist.
        </h2>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          The event or resource you were looking for might have been moved, rescheduled, or removed from CampusHub.
        </p>

        {/* Quick action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto gap-2">
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
          </Link>
          <Link href="/events" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto gap-2">
              <Calendar className="w-4 h-4" />
              <span>Browse Events</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
