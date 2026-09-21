"use client";

import { Quote } from "lucide-react";
import { Card } from "@/components/ui/Card";

const COMMUNITY_VOICES = [
  {
    quote:
      "Before CampusHub, finding when robotics teams held build sessions was scattered across three different group chats. Having one official hub makes recruiting new engineers 10x easier.",
    author: "David K. Vance",
    role: "President, Autonomous Robotics Lab",
    gradYear: "Class of 2026",
    initials: "DV",
    accent: "bg-cyan-500",
  },
  {
    quote:
      "The real-time RSVP counts let us forecast room sizes and catering for our tech talks with zero guesswork. It elevated our chapter's events to an entirely new standard.",
    author: "Maya Lin",
    role: "Lead Organizer, ACM Chapter",
    gradYear: "Class of 2027",
    initials: "ML",
    accent: "bg-indigo-500",
  },
  {
    quote:
      "As a first-year student, CampusHub was the first place where I felt plugged into campus life. Within two weeks, I joined the Debating Union and attended my first hackathon.",
    author: "Tariq Hassan",
    role: "First-Year Representative",
    gradYear: "Class of 2029",
    initials: "TH",
    accent: "bg-amber-500",
  },
];

export function CommunitySection() {
  return (
    <section id="community" className="py-16 md:py-24 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Student Voices
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Built by Students, for Students
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
            Hear how campus leaders and students are transforming college life and community connection.
          </p>
        </div>

        {/* Testimonial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {COMMUNITY_VOICES.map((voice, idx) => (
            <Card
              key={idx}
              className="p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-purple-300 dark:hover:border-purple-800/60"
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
          ))}
        </div>
      </div>
    </section>
  );
}
