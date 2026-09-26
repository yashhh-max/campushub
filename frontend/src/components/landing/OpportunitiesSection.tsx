"use client";

import { useState } from "react";
import {
  Briefcase,
  Award,
  Code2,
  GraduationCap,
  Calendar,
  Building,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { SAMPLE_OPPORTUNITIES } from "@/data/sampleData";
import { OpportunityItem, OpportunityType } from "@/types/campus";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

const FILTER_TABS: Array<"All" | OpportunityType> = [
  "All",
  "Placement Drive",
  "Internship",
  "Certification",
  "Hackathon",
];

export function OpportunitiesSection() {
  const [selectedType, setSelectedType] = useState<"All" | OpportunityType>("All");

  const filteredOpportunities =
    selectedType === "All"
      ? SAMPLE_OPPORTUNITIES
      : SAMPLE_OPPORTUNITIES.filter((opp) => opp.type === selectedType);

  const getTypeIcon = (type: OpportunityType) => {
    switch (type) {
      case "Placement Drive":
        return <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "Internship":
        return <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case "Certification":
        return <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case "Hackathon":
      case "Competition":
        return <Code2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <GraduationCap className="w-4 h-4 text-slate-600" />;
    }
  };

  const getTypeBadgeStyle = (type: OpportunityType) => {
    switch (type) {
      case "Placement Drive":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "Internship":
        return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      case "Certification":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "Hackathon":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <section id="opportunities" className="py-16 md:py-24 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <RevealOnScroll direction="down" duration={500} className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-3">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Training & Placement Cell • Corporate Relations</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Career & Campus Opportunities
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Direct recruitment drives, verified industry internships, technical certifications, and national hackathons curated for KPRIT students.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedType(tab)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  selectedType === tab
                    ? "bg-indigo-900 dark:bg-indigo-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </RevealOnScroll>

        {/* Opportunity Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpportunities.map((opp, idx) => (
            <RevealOnScroll
              key={opp.id}
              direction="up"
              delay={idx * 80}
              duration={650}
              className="h-full"
            >
              <Card className="h-full p-6 flex flex-col justify-between border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-700/80 transition-all shadow-xs hover:shadow-md">
                <div>
                  {/* Top Bar with Type & Verified Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getTypeBadgeStyle(
                        opp.type
                      )}`}
                    >
                      {getTypeIcon(opp.type)}
                      {opp.type}
                    </span>
                    {opp.is_verified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-900/60">
                        <CheckCircle2 className="w-3 h-3" />
                        TPO Verified
                      </span>
                    )}
                  </div>

                  {/* Title & Organization */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug mb-1">
                    {opp.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-medium mb-3">
                    <Building className="w-3.5 h-3.5 shrink-0" />
                    <span>{opp.organization}</span>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    {opp.description}
                  </p>

                  {/* Meta Box: Eligibility & Stipend */}
                  <div className="space-y-1.5 text-xs bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 mb-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-400 font-medium">Eligibility:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                        {opp.eligibility}
                      </span>
                    </div>
                    {opp.stipend_or_package && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                        <span className="text-slate-400 font-medium">Compensation:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {opp.stipend_or_package}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {opp.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Deadline: {opp.deadline}</span>
                  </div>
                  <a
                    href={opp.link || "https://kpritech.ac.in/placements/"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="text-xs group h-8 px-2.5">
                      <span>View Details</span>
                      <ExternalLink className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </a>
                </div>
              </Card>
            </RevealOnScroll>
          ))}
        </div>

        {/* Bottom TPO Note Banner */}
        <div className="mt-12 p-5 rounded-2xl bg-indigo-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h4 className="text-sm font-bold">KPRIT Corporate Relations &amp; Placement Office</h4>
              <p className="text-xs text-indigo-200 mt-0.5">
                Dean Corporate Relations: Anish Kr. Srivastava • Inquiries: cr.dean@kpritech.ac.in
              </p>
            </div>
          </div>
          <a
            href="https://kpritech.ac.in/placements/"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Button size="sm" className="bg-white text-indigo-950 hover:bg-slate-100 font-bold text-xs">
              <span>Official T&amp;P Portal</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
