"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for observability
    console.error("CampusHub Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-md w-full text-center py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-xs font-semibold text-amber-700 dark:text-amber-300 mb-6">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>System Error • 500</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">
          Something went wrong
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          An unexpected error occurred while processing your campus request. Our logging system has captured the incident.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={() => reset()} className="w-full sm:w-auto gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </Button>
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto gap-2">
              <Home className="w-4 h-4" />
              <span>Campus Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
