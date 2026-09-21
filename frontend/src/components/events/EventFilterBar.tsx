"use client";

import { Search, X, CalendarDays } from "lucide-react";
import { EventCategory } from "@/types/campus";

const CATEGORIES: Array<"All" | EventCategory> = [
  "All",
  "Tech",
  "Career",
  "Arts",
  "Social",
  "Academic",
  "Sports",
];

interface EventFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  upcomingOnly: boolean;
  onUpcomingToggle: (value: boolean) => void;
  onReset: () => void;
}

export function EventFilterBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  upcomingOnly,
  onUpcomingToggle,
  onReset,
}: EventFilterBarProps) {
  const hasActiveFilters = !!search || (category && category !== "All") || !upcomingOnly;

  return (
    <div className="space-y-4 mb-8">
      {/* Search Input Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events by title, description, venue, or host club..."
            className="block w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-xs transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Upcoming Toggle Pill */}
        <button
          type="button"
          onClick={() => onUpcomingToggle(!upcomingOnly)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            upcomingOnly
              ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-xs"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Upcoming Only</span>
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-2 cursor-pointer flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              category === cat
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
