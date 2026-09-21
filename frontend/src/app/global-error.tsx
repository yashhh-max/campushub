"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("CampusHub Critical Global Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4 font-sans">
        <div className="max-w-md w-full text-center py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-800 bg-red-950/50 text-xs font-semibold text-red-300 mb-6">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Critical Application Exception</span>
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-3">
            CampusHub System Halt
          </h1>

          <p className="text-sm text-slate-400 mb-8 leading-relaxed">
            The application experienced an unrecoverable rendering exception.
          </p>

          <Button onClick={() => reset()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>Restart Application</span>
          </Button>
        </div>
      </body>
    </html>
  );
}
