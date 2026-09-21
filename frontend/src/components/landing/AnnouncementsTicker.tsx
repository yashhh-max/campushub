"use client";

import { Megaphone, Building2, Calendar } from "lucide-react";
import { SAMPLE_ANNOUNCEMENTS } from "@/data/sampleData";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

export function AnnouncementsTicker() {
  return (
    <section id="announcements" className="py-16 md:py-24 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 mb-3">
            <Megaphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Direct Administration Feed</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Official Campus Notices & Alerts
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
            Real-time updates from university administration, safety services, and academic registrars.
          </p>
        </div>

        {/* Notices Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SAMPLE_ANNOUNCEMENTS.map((announcement) => {
            const isUrgent = announcement.priority === "urgent";

            return (
              <Card
                key={announcement.id}
                className={`p-6 flex flex-col justify-between ${
                  isUrgent
                    ? "border-rose-300 dark:border-rose-900/80 bg-rose-50/20 dark:bg-rose-950/10"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Badge
                      variant={
                        announcement.priority === "urgent"
                          ? "urgent"
                          : announcement.priority === "official"
                          ? "official"
                          : "muted"
                      }
                    >
                      {announcement.priority.toUpperCase()}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(announcement.publishedAt || announcement.published_at || new Date().toISOString())}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                    {announcement.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    {announcement.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{announcement.author}</span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {announcement.category}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
