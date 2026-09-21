"use client";

import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CTASection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-indigo-200 border border-white/10 mb-6 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>CampusHub Ecosystem</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight">
          Ready to Elevate Your College Experience?
        </h2>

        <p className="mt-4 text-base sm:text-lg text-indigo-200 max-w-2xl mx-auto leading-relaxed">
          Join over 14,000 students discovering events, networking with student orgs, and staying on top of campus notices.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
          <Button
            size="lg"
            className="w-full sm:w-auto bg-white text-indigo-950 hover:bg-slate-100 shadow-lg hover:shadow-xl font-bold"
            onClick={() => alert("Student account creation with university email verification is scheduled for Phase 2 (JWT).")}
          >
            <span>Get Started with Student Email</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <a href="#events" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10"
            >
              Browse Public Events
            </Button>
          </a>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs sm:text-sm text-indigo-200/80">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>.edu University Email Verification</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>100% Free for Registered Clubs</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Strict Privacy & Zero Ad-Tracking</span>
          </div>
        </div>
      </div>
    </section>
  );
}
