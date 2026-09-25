"use client";

import Link from "next/link";
import { Users, Clock, UserCheck, ArrowRight } from "lucide-react";
import { SAMPLE_CLUBS } from "@/data/sampleData";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

export function ClubsPreview() {
  return (
    <section id="clubs" className="py-16 md:py-24 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealOnScroll direction="down" duration={500} className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Student Organizations
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Discover Student Clubs & Chapters
            </h2>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-400 max-w-2xl">
              Connect with fellow students, build leadership experience, and collaborate on cutting-edge projects across 120+ verified campus organizations.
            </p>
          </div>

          <div className="hidden sm:block">
            <Link href="/clubs">
              <Button variant="outline" size="sm">
                <span>Explore All Clubs</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </RevealOnScroll>

        {/* Clubs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_CLUBS.map((club, index) => (
            <RevealOnScroll
              key={club.id}
              direction="up"
              delay={index * 80}
              duration={650}
              className="h-full"
            >
              <Card
                className="h-full p-6 flex flex-col justify-between group hover:border-amber-300 dark:hover:border-amber-800/60"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${club.accentColor || club.accent_color}`}
                    >
                      {club.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {club.memberCount || club.member_count || 45} members
                    </span>
                  </div>

                  <Link href={`/clubs/${club.id || club.slug}`}>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {club.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                    {club.description}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                      <span>Lead: {club.president || club.leader_name || "Club Executive"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Meets: {club.meetingSchedule || club.meeting_schedule}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {club.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Verified Chapter
                  </span>
                  <Link href={`/clubs/${club.id || club.slug}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700"
                    >
                      View Club &rarr;
                    </Button>
                  </Link>
                </div>
              </Card>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
