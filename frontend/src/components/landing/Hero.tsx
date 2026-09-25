"use client";

import Link from "next/link";
import {
  Sparkles,
  Calendar,
  Compass,
  GraduationCap,
  Users,
  Ticket,
  QrCode,
  MessageSquare,
  Trophy,
  ShieldCheck,
  Code2,
  CheckCircle2,
  Activity,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { STATS_SUMMARY } from "@/data/sampleData";
import { CursorParallax, ParallaxLayer } from "@/components/ui/CursorParallax";

export function Hero() {
  return (
    <CursorParallax
      className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24"
      maxOffset={52}
      ease={0.075}
    >
      {/* ========================================================
          LAYER 1: HERO BACKGROUND / GRADIENT / TEXTURE
          Movement strength: 0.04 (Subtle, deep perspective)
      ======================================================== */}
      <ParallaxLayer depth={0.04} className="absolute inset-0 -z-20 pointer-events-none">
        {/* Primary Ambient Aurora Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[450px] bg-gradient-to-tr from-indigo-500/20 via-blue-500/15 to-violet-500/15 blur-3xl rounded-full" />
        {/* Secondary Warm Accent Glow */}
        <div className="absolute top-1/4 right-1/4 w-[380px] h-[260px] bg-gradient-to-bl from-amber-500/12 via-orange-500/10 to-transparent blur-2xl rounded-full" />
        {/* Tertiary Cyan Accent Glow */}
        <div className="absolute bottom-1/4 left-1/4 w-[350px] h-[240px] bg-gradient-to-tr from-cyan-500/12 via-teal-500/8 to-transparent blur-2xl rounded-full" />

        {/* GitHub Universe-style Coordinate Grid & Matrix Texture */}
        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.065] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: "32px 32px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 80%)",
          }}
        />
      </ParallaxLayer>

      {/* ========================================================
          LAYER 2: LARGE DECORATIVE CAMPUSHUB SHAPES
          Movement strength: 0.09 (Orbital trajectory rings, geometric shields)
      ======================================================== */}
      <ParallaxLayer
        depth={0.09}
        rotateFactor={3}
        className="absolute inset-0 -z-10 pointer-events-none flex items-center justify-center"
      >
        {/* Large Outer Orbital Ellipse */}
        <div className="absolute w-[820px] h-[420px] rounded-[100%] border border-dashed border-indigo-400/20 dark:border-indigo-400/15 -rotate-12" />
        {/* Inner Trajectory Ring */}
        <div className="absolute w-[560px] h-[300px] rounded-[100%] border border-indigo-300/25 dark:border-indigo-500/20 rotate-6" />

        {/* Decorative Translucent Geometry Shields */}
        <div className="absolute top-16 left-[8%] w-32 h-32 rounded-3xl border border-indigo-500/20 dark:border-indigo-400/20 bg-indigo-500/5 backdrop-blur-[2px] rotate-12 hidden lg:block" />
        <div className="absolute top-28 right-[10%] w-36 h-36 rounded-[2.5rem] border border-blue-500/20 dark:border-blue-400/20 bg-blue-500/5 backdrop-blur-[2px] -rotate-12 hidden lg:block" />
        <div className="absolute bottom-20 left-[14%] w-24 h-24 rounded-2xl border border-amber-500/20 dark:border-amber-400/20 bg-amber-500/5 backdrop-blur-[2px] rotate-45 hidden xl:block" />
      </ParallaxLayer>

      {/* ========================================================
          LAYER 3: SECONDARY ILLUSTRATION ELEMENTS
          Movement strength: 0.16 (Floating CampusHub event & club cards)
      ======================================================== */}
      <ParallaxLayer
        depth={0.16}
        rotateFactor={-5}
        className="absolute inset-0 z-10 pointer-events-none hidden lg:block"
      >
        <div className="relative w-full h-full max-w-7xl mx-auto px-4">
          {/* Floating Card Left: HackCampus 2026 */}
          <div className="absolute top-12 left-4 xl:left-8 w-64 p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/85 backdrop-blur-md border border-indigo-200/70 dark:border-indigo-800/70 shadow-xl shadow-indigo-500/5 transform -rotate-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Hackathon
              </span>
              <span className="text-[11px] font-medium text-slate-400">Oct 14</span>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Code2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  HackCampus 2026
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  248/300 Registered
                </p>
              </div>
            </div>
            <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full w-[82%] rounded-full" />
            </div>
          </div>

          {/* Floating Card Right: Verified Student Org */}
          <div className="absolute top-16 right-4 xl:right-8 w-64 p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/85 backdrop-blur-md border border-blue-200/70 dark:border-blue-800/70 shadow-xl shadow-blue-500/5 transform rotate-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <ShieldCheck className="w-3 h-3 text-blue-500" />
                Verified Org
              </span>
              <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                420 Members
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  ACM Student Chapter
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Next: Wed @ 6:00 PM
                </p>
              </div>
            </div>
          </div>

          {/* Floating Chip Lower-Left: Instant QR Pass */}
          <div className="absolute bottom-28 left-6 xl:left-14 p-2.5 pr-4 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-lg flex items-center gap-3 transform -rotate-1 hidden xl:flex">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1">
                Fast-Track QR Pass
                <CheckCircle2 className="w-3 h-3 text-emerald-500 inline" />
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Instant Check-in Ready
              </div>
            </div>
          </div>

          {/* Floating Chip Lower-Right: Live Community Chat */}
          <div className="absolute bottom-24 right-6 xl:right-14 p-2.5 pr-4 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-lg flex items-center gap-3 transform rotate-2 hidden xl:flex">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Quad Live Lounge
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                48 Students Online Now
              </div>
            </div>
          </div>
        </div>
      </ParallaxLayer>

      {/* ========================================================
          LAYER 4: MAIN HERO VISUAL / CAMPUS CONSTELLATION
          Movement strength: 0.24 (Interconnected collegiate nexus)
      ======================================================== */}
      <ParallaxLayer
        depth={0.24}
        rotateFactor={4}
        scaleFactor={0.03}
        className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center opacity-85 dark:opacity-90"
      >
        {/* Subtle Central Constellation Filament Network behind headline & badges */}
        <div className="relative w-[520px] h-[340px] pointer-events-none -mt-4">
          {/* SVG Connecting Constellation Lines */}
          <svg
            className="absolute inset-0 w-full h-full text-indigo-400/30 dark:text-indigo-500/25"
            viewBox="0 0 520 340"
            fill="none"
          >
            <path
              d="M110 80 L260 160 L410 80 M260 160 L140 270 M260 160 L380 270 M110 80 L60 190 L140 270 M410 80 L460 190 L380 270"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            {/* Luminous nodes */}
            <circle cx="110" cy="80" r="4" fill="#6366f1" />
            <circle cx="410" cy="80" r="4" fill="#3b82f6" />
            <circle cx="140" cy="270" r="4" fill="#10b981" />
            <circle cx="380" cy="270" r="4" fill="#f59e0b" />
            <circle cx="60" cy="190" r="3" fill="#8b5cf6" />
            <circle cx="460" cy="190" r="3" fill="#06b6d4" />
          </svg>

          {/* Central Campus Emblem Glyph */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-500 p-0.5 shadow-xl shadow-indigo-500/25 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-white/10 backdrop-blur-xs flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white drop-shadow-md" />
            </div>
          </div>
        </div>
      </ParallaxLayer>

      {/* ========================================================
          LAYER 5: SMALL FOREGROUND DECORATIONS & MICRO-PARTICLES
          Movement strength: 0.32 (High parallax: sparkles, trophy, badges)
      ======================================================== */}
      <ParallaxLayer
        depth={0.32}
        rotateFactor={12}
        scaleFactor={0.05}
        className="absolute inset-0 z-10 pointer-events-none"
      >
        <div className="relative w-full h-full max-w-7xl mx-auto px-4">
          {/* Gold Sparkle Badge Top Left */}
          <div className="absolute top-6 left-[22%] p-2 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-400/30 text-amber-500 shadow-md backdrop-blur-xs transform -rotate-12 hidden md:flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
              Campus Top 1%
            </span>
          </div>

          {/* Trophy Micro-Chip Top Right */}
          <div className="absolute top-8 right-[24%] p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 border border-indigo-400/30 text-indigo-500 shadow-md backdrop-blur-xs transform rotate-12 hidden md:flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
              $5,000 Prizes
            </span>
          </div>

          {/* Compass Chip Floating Middle Left */}
          <div className="absolute top-48 left-[5%] p-2 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-600 dark:text-cyan-400 shadow-lg backdrop-blur-xs hidden xl:block">
            <Compass className="w-4 h-4" />
          </div>

          {/* Ticket Chip Floating Middle Right */}
          <div className="absolute top-48 right-[5%] p-2 rounded-full bg-rose-500/15 border border-rose-400/30 text-rose-600 dark:text-rose-400 shadow-lg backdrop-blur-xs hidden xl:block">
            <Ticket className="w-4 h-4" />
          </div>

          {/* Floating Micro Bokeh Orbs */}
          <div className="absolute top-24 left-[34%] w-2 h-2 rounded-full bg-indigo-400/60 blur-[0.5px] animate-pulse" />
          <div className="absolute top-36 right-[32%] w-2.5 h-2.5 rounded-full bg-amber-400/70 blur-[0.5px]" />
          <div className="absolute bottom-32 left-[28%] w-2 h-2 rounded-full bg-emerald-400/60 blur-[0.5px]" />
          <div className="absolute bottom-28 right-[30%] w-3 h-3 rounded-full bg-blue-400/60 blur-[1px]" />
        </div>
      </ParallaxLayer>

      {/* ========================================================
          STABLE HERO CONTENT (Text, CTAs, Badges, Metrics)
          Remains 100% stable, fully legible, and interactive
      ======================================================== */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pointer-events-auto">
        {/* Top Tag Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-6 shadow-xs backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>The Next-Generation University Portal</span>
          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-indigo-800 dark:text-indigo-200">
            Production v1.0 Live
          </span>
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
          Discover hackathons and campus events, join verified student organizations, participate in
          real-time community chat, and check in via secure QR event tickets.
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
            <Button
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
            >
              <span>Demo Login</span>
            </Button>
          </Link>
        </div>

        {/* Architecture Badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            Next.js 16 App Router
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            Django 5.1 REST
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            Django Channels & Daphne
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            Redis 7
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            PostgreSQL
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            Vector QR Check-In
          </span>
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
    </CursorParallax>
  );
}
