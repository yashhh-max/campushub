"use client";

import {
  CalendarDays,
  Users2,
  Megaphone,
  HeartHandshake,
  ArrowUpRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

const FEATURES = [
  {
    id: "events",
    title: "Campus Events & Hackathons",
    description:
      "Discover technical symposiums, hackathons, guest lectures, and campus festivals. Register in seconds, add to your calendar, and manage your verified event passes.",
    icon: CalendarDays,
    badge: "Interactive Calendar",
    color: "from-blue-500/20 to-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    linkText: "View upcoming events",
    href: "#events",
  },
  {
    id: "clubs",
    title: "Student Bodies & Professional Chapters",
    description:
      "Explore official student chapters including IEEE, CSI, NSS, Robotics & AI Society, and IIC Innovation Cell with faculty mentorship and active meeting schedules.",
    icon: Users2,
    badge: "Student Chapters",
    color: "from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400",
    linkText: "Explore organization directory",
    href: "#clubs",
  },
  {
    id: "announcements",
    title: "Official Academic Notices & Circulars",
    description:
      "Direct feed from the Controller of Examinations, Training & Placement Cell (TPO), and Academic Deans. Filter by department with alerts for exam and placement updates.",
    icon: Megaphone,
    badge: "Verified Circulars",
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400",
    linkText: "Read announcements",
    href: "#announcements",
  },
  {
    id: "opportunities",
    title: "Career & Placement Opportunities",
    description:
      "Connect with marquee industry recruitment drives, verified technical internships, AWS cloud certifications, and national innovation hackathons curated by TPO.",
    icon: HeartHandshake,
    badge: "TPO Connect",
    color: "from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400",
    linkText: "Browse opportunities",
    href: "#opportunities",
  },
];

export function Features() {
  return (
    <section id="features" className="py-16 md:py-24 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <RevealOnScroll direction="down" duration={500} className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Core Pillars
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Everything College Life Needs in One Place
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Engineered from the ground up to replace fragmented emails, paper posters, and disparate chat groups with a clean, high-performance platform.
          </p>
        </RevealOnScroll>

        {/* 4 Feature Cards Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <RevealOnScroll
                key={feature.id}
                direction="up"
                delay={index * 90}
                duration={600}
                className="h-full"
              >
                <Card
                  className="h-full p-6 sm:p-8 flex flex-col justify-between group hover:border-indigo-300 dark:hover:border-indigo-800/60"
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
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
