"use client";

import { Quote } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

const COMMUNITY_VOICES = [
  {
    quote:
      "Having one unified platform for hackathons, technical workshops, and lab sessions makes recruiting student engineers across CSE, AI/ML, and ECE effortless. No more scattered WhatsApp groups.",
    author: "K. Karthik",
    role: "President, KPRIT Robotics & AI Society",
    gradYear: "Class of 2026",
    initials: "KK",
    accent: "bg-cyan-600",
  },
  {
    quote:
      "The integrated event registration and attendance management helped us coordinate our national technical conference with zero friction. It elevates KPRIT's collegiate tech culture.",
    author: "Sai Varun",
    role: "Chair, IEEE KPRIT Student Branch",
    gradYear: "Class of 2026",
    initials: "SV",
    accent: "bg-indigo-900",
  },
  {
    quote:
      "Publishing our community service initiatives, blood donation drives, and Ghatkesar rural projects directly on the portal dramatically boosted volunteer turnout from 1st and 2nd years.",
    author: "Sneha Rao",
    role: "Student Coordinator, NSS KPRIT Unit",
    gradYear: "Class of 2027",
    initials: "SR",
    accent: "bg-emerald-600",
  },
];

export function CommunitySection() {
  return (
    <section id="community" className="py-16 md:py-24 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealOnScroll direction="down" duration={500} className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Student Voices
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Built by Students, for Students
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
            Hear how campus leaders and students are transforming college life and community connection.
          </p>
        </RevealOnScroll>

        {/* Testimonial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {COMMUNITY_VOICES.map((voice, idx) => (
            <RevealOnScroll
              key={idx}
              direction="up"
              delay={idx * 100}
              duration={650}
              className="h-full"
            >
              <Card
                className="h-full p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-purple-300 dark:hover:border-purple-800/60"
              >
                <div>
                  <Quote className="w-8 h-8 text-indigo-400/40 dark:text-indigo-400/20 mb-4" />
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed italic mb-6">
                    &ldquo;{voice.quote}&rdquo;
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full ${voice.accent} text-white font-bold flex items-center justify-center text-sm shadow-xs`}
                  >
                    {voice.initials}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {voice.author}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {voice.role} • {voice.gradYear}
                    </p>
                  </div>
                </div>
              </Card>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
