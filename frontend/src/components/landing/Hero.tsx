"use client";

import Link from "next/link";
import { Sparkles, Calendar, Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { STATS_SUMMARY } from "@/data/sampleData";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
      {/* Subtle Background Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-500/15 via-blue-500/10 to-amber-500/10 blur-3xl pointer-events-none -z-10 rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Tag Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-6 shadow-xs backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>The Next-Generation University Portal</span>
          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-indigo-800 dark:text-indigo-200">Production v1.0 Live</span>
        </div>

        {/* Primary Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.15]">
          Your Campus. Your Community.{" "}
          <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-500 bg-clip-text text-transparent">
            All in One Hub.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Discover hackathons and campus events, join verified student organizations, participate in real-time community chat, and check in via secure QR event tickets.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-lg mx-auto">
          <Link href="/events" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto group">
              <span>Explore Events</span>
              <Calendar className="w-4 h-4 ml-1 group-hover:scale-110 transition-transform" />
            </Button>
          </Link>
          <a href="#clubs" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto group">
              <span>Browse Clubs</span>
              <Compass className="w-4 h-4 ml-1 group-hover:rotate-45 transition-transform" />
            </Button>
          </a>
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="ghost" size="lg" className="w-full sm:w-auto text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50">
              <span>Demo Login</span>
            </Button>
          </Link>
        </div>

        {/* Architecture Badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">Next.js 16 App Router</span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">Django 5.1 REST</span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">Django Channels & Daphne</span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">Redis 7</span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">PostgreSQL</span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">Vector QR Check-In</span>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="mt-14 sm:mt-20 pt-8 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {STATS_SUMMARY.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center p-3 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-900/40 transition-colors"
              >
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {stat.value}
                </span>
                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {stat.label}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {stat.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
