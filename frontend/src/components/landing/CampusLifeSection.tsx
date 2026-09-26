"use client";

import {
  MapPin,
  Library,
  Cpu,
  Trophy,
  Bus,
  ShieldCheck,
  Building2,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

const CAMPUS_FACILITIES = [
  {
    title: "Central Library & Digital Knowledge Center",
    description:
      "Thousands of technical volumes, international IEEE and Springer digital journal subscriptions, air-conditioned study cubicles, and 24/7 online reference access.",
    icon: Library,
    badge: "Academic Core",
  },
  {
    title: "High-Performance Computing & AI Labs",
    description:
      "Modern compute infrastructure equipped with high-speed fiber connectivity, GPU-accelerated workstations, and specialized centers for Data Science and Robotics.",
    icon: Cpu,
    badge: "Research Infrastructure",
  },
  {
    title: "Sports, Athletics & Recreation Complex",
    description:
      "Expansive outdoor grounds for Cricket, Football, and Volleyball along with dedicated indoor courts for Badminton, Table Tennis, and physical fitness gymnasiums.",
    icon: Trophy,
    badge: "Student Wellness",
  },
  {
    title: "Comprehensive Bus Transit Network",
    description:
      "A fleet of college-operated buses servicing all key transit corridors across Hyderabad, Secunderabad, Uppal, ECIL, Dilsukhnagar, LB Nagar, and Tarnaka.",
    icon: Bus,
    badge: "Campus Connectivity",
  },
];

export function CampusLifeSection() {
  return (
    <section id="campus" className="py-16 md:py-24 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealOnScroll direction="down" duration={500} className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-3">
            <MapPin className="w-3.5 h-3.5" />
            <span>Ghanpur, Ghatkesar • Hyderabad</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Campus Life &amp; Institutional Infrastructure
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            A serene, technology-empowered engineering campus designed to foster academic concentration, student innovation, and vibrant collegiate culture.
          </p>
        </RevealOnScroll>

        {/* Main Campus Feature Banner */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                  Ideal Learning Environment
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                  Located Adjacent to NTPC &amp; Near Infosys SEZ
                </h3>
                <p className="text-sm sm:text-base text-indigo-100/90 leading-relaxed">
                  Situated in Ghanpur Village, Ghatkesar, KPRIT offers proximity to major IT and industrial hubs in Hyderabad while maintaining an eco-friendly, green campus setting conducive to deep study and technical exploration.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
                <div>
                  <span className="block text-indigo-200 text-[11px]">Affiliation</span>
                  <span className="font-bold text-white text-sm">JNTU Hyderabad</span>
                </div>
                <div>
                  <span className="block text-indigo-200 text-[11px]">Accreditation</span>
                  <span className="font-bold text-white text-sm">NAAC &apos;A&apos; Grade</span>
                </div>
                <div>
                  <span className="block text-indigo-200 text-[11px]">Counseling Code</span>
                  <span className="font-bold text-amber-300 text-sm">KPRT</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://kpritech.ac.in/contact-us/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="md" className="bg-white text-indigo-950 hover:bg-slate-100 font-bold text-xs">
                    <span>Contact Administration</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </a>
                <a
                  href="https://kpritech.ac.in/why-kprit/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="md" className="border border-white/30 text-white bg-white/10 hover:bg-white/20 text-xs">
                    <span>Explore KPRIT Heritage</span>
                  </Button>
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full bg-slate-800">
              <img
                src="/images/campus-showcase.jpg"
                alt="KPRIT Campus Infrastructure"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent lg:hidden" />
              <div className="absolute bottom-4 left-4 right-4 text-xs text-white lg:hidden">
                <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md">
                  📍 KPRIT Ghanpur Campus, Ghatkesar
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Infrastructure Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CAMPUS_FACILITIES.map((facility, idx) => {
            const Icon = facility.icon;
            return (
              <RevealOnScroll
                key={facility.title}
                direction="up"
                delay={idx * 70}
                duration={600}
                className="h-full"
              >
                <Card className="h-full p-6 flex flex-col justify-between border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {facility.badge}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                      {facility.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {facility.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>College Certified Facility</span>
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
