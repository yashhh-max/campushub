"use client";

import Link from "next/link";
import {
  Calendar,
  Compass,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  Building2,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { INSTITUTIONAL_PILLARS } from "@/data/sampleData";
import { useAuth } from "@/context/AuthContext";

export function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative overflow-hidden pt-10 pb-16 md:pt-16 md:pb-20">
      {/* Subtle Background Collegiate Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-gradient-to-tr from-indigo-900/10 via-blue-800/10 to-amber-500/10 blur-3xl pointer-events-none z-0 rounded-full" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Institutional Affiliation Header Pill */}
        <div className="relative z-10 inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800/80 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 mb-6 shadow-xs">
          <span className="font-bold text-indigo-900 dark:text-indigo-400">
            Kommuri Pratap Reddy Institute of Technology
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
          <span className="text-slate-600 dark:text-slate-400 font-semibold">
            Autonomous • Affiliated to JNTUH
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-100 dark:border-indigo-900">
            EAMCET: KPRT
          </span>
        </div>

        {/* Primary Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.15]">
          Everything KPRIT Students Need,{" "}
          <span className="bg-gradient-to-r from-indigo-900 via-indigo-700 to-blue-700 dark:from-indigo-400 dark:via-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
            In One Place.
          </span>
        </h1>

        {/* Institutional Subtitle */}
        <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Discover campus events, student clubs, announcements, opportunities, and everyday college services through one connected KPRIT platform.
        </p>

        {/* Action Buttons - Authenticated vs Guest */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-indigo-900 hover:bg-indigo-950 text-white font-bold group shadow-md"
                >
                  <span>Go to Student Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              <Link href="/events" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto font-medium">
                  <span>Browse Events</span>
                  <Calendar className="w-4 h-4 ml-1 text-slate-400" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-indigo-900 hover:bg-indigo-950 text-white font-bold group shadow-md"
                >
                  <span>Student Login</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              <a href="#events" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto font-medium">
                  <span>Explore Campus</span>
                  <Calendar className="w-4 h-4 ml-1 text-slate-400" />
                </Button>
              </a>
            </>
          )}
        </div>

        {/* Campus Community Showcase Photo Frame */}
        <div className="mt-10 sm:mt-12 max-w-4xl mx-auto px-2 sm:px-0">
          <div className="relative z-10 rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group">
            <img
              src="/images/campus-showcase.jpg"
              alt="KPRIT Campus and Technology Laboratories"
              className="w-full h-56 sm:h-72 md:h-96 object-cover object-center transform group-hover:scale-[1.01] transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs sm:text-sm font-medium pointer-events-none">
              <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20">
                📍 KPRIT Main Campus • Ghanpur (V), Ghatkesar, Hyderabad
              </span>
              <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-indigo-900/90 backdrop-blur-md font-semibold text-xs border border-white/10">
                NAAC &apos;A&apos; Grade • NBA Accredited
              </span>
            </div>
          </div>
        </div>

        {/* Institutional Pillars Ribbon */}
        <div className="mt-12 sm:mt-16 pt-8 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-left">
            {INSTITUTIONAL_PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800/80 transition-colors shadow-2xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                    {pillar.badge}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {pillar.title}
                </h4>
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mt-0.5">
                  {pillar.subtitle}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
