"use client";

import {
  CalendarDays,
  Users2,
  Megaphone,
  HeartHandshake,
  ArrowUpRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";

const FEATURES = [
  {
    id: "events",
    title: "Campus Events Discovery",
    description:
      "Find hackathons, workshops, music concerts, and networking dinners. RSVP in seconds, add to your Google or Apple calendar, and see live attendee counts.",
    icon: CalendarDays,
    badge: "Interactive Calendar",
    color: "from-blue-500/20 to-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    linkText: "View upcoming events",
    href: "#events",
  },
  {
    id: "clubs",
    title: "Student Clubs & Societies",
    description:
      "Browse over 120+ student-led chapters across Engineering, Debating, Arts, Entrepreneurship, and Cultural associations with verified meeting schedules.",
    icon: Users2,
    badge: "120+ Active Orgs",
    color: "from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400",
    linkText: "Explore organization directory",
    href: "#clubs",
  },
  {
    id: "announcements",
    title: "Official Announcements",
    description:
      "Direct feed from the Office of the Registrar, Dean of Students, and Campus Safety. Filter by department with push notifications for urgent weather or transit alerts.",
    icon: Megaphone,
    badge: "Verified Notices",
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400",
    linkText: "Read announcements",
    href: "#announcements",
  },
  {
    id: "community",
    title: "Student Community & Voices",
    description:
      "Connect with peers sharing your major, discover study cohorts, and exchange course insights in a moderated, safe, university-verified environment.",
    icon: HeartHandshake,
    badge: "Student Powered",
    color: "from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400",
    linkText: "Meet the community",
    href: "#community",
  },
];

export function Features() {
  return (
    <section id="features" className="py-16 md:py-24 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Core Pillars
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Everything College Life Needs in One Place
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Engineered from the ground up to replace fragmented emails, paper posters, and disparate chat groups with a clean, high-performance platform.
          </p>
        </div>

        {/* 4 Feature Cards Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.id}
                className="p-6 sm:p-8 flex flex-col justify-between group hover:border-indigo-300 dark:hover:border-indigo-800/60"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${feature.color} flex items-center justify-center`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {feature.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <a
                    href={feature.href}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <span>{feature.linkText}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
