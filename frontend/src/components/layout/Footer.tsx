"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { fetchSystemHealth } from "@/lib/api";
import { SystemHealth } from "@/types/campus";

export function Footer() {
  const [health, setHealth] = useState<SystemHealth>({ status: "checking" });

  useEffect(() => {
    fetchSystemHealth()
      .then((res) => setHealth(res))
      .catch(() => setHealth({ status: "offline" }));
  }, []);

  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-10">
          {/* Column 1 & 2: Institution & Address */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-900 to-blue-800 flex items-center justify-center text-white shadow-sm">
                <GraduationCap className="w-5 h-5 text-amber-300" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                  KPRIT <span className="text-indigo-900 dark:text-indigo-400 font-bold">CampusHub</span>
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Kommuri Pratap Reddy Institute of Technology
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
              An Autonomous Institution affiliated to JNTUH, approved by AICTE, and accredited with NAAC &apos;A&apos; Grade and NBA. Empowering engineering education, student innovation, and corporate careers.
            </p>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-indigo-700 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Survey No. 1140, Near Infosys, Adjacent to NTPC Power Grid, Ghanpur (V), Ghatkesar (M), Medchal-Malkajgiri Dist, Hyderabad, Telangana – 501301.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-700 dark:text-indigo-400 shrink-0" />
                <span>cr.dean@kpritech.ac.in &bull; info@kpritech.ac.in</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-700 dark:text-indigo-400 shrink-0" />
                <span>+91 84980 52084 / +91 95420 42666</span>
              </div>
            </div>
          </div>

          {/* Column 3: Campus Exploration */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Student Campus
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <a href="#events" className="hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors">
                  Upcoming Campus Events
                </a>
              </li>
              <li>
                <a href="#clubs" className="hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors">
                  Student Chapters &amp; Clubs
                </a>
              </li>
              <li>
                <a href="#announcements" className="hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors">
                  Official Circulars &amp; Notices
                </a>
              </li>
              <li>
                <a href="#opportunities" className="hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors">
                  TPO Placement Drives
                </a>
              </li>
              <li>
                <a href="#campus" className="hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors">
                  Campus Life &amp; Facilities
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Academic & Institutional */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Academics &amp; Governance
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <a
                  href="https://kpritech.ac.in/academic-regulations/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
                >
                  <span>Academic Regulations</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://kpritech.ac.in/academic-calendar/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
                >
                  <span>Academic Calendar</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://kpritech.ac.in/placements/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
                >
                  <span>Training &amp; Placement Cell</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://kpritech.ac.in/iic-kprit/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
                >
                  <span>Institution&apos;s Innovation Council</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://kpritech.ac.in/iqac/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
                >
                  <span>Internal Quality Assurance (IQAC)</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 5: Accreditation & Portal Status */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Institution Verification
            </h4>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400 shrink-0" />
                <span>Autonomous • JNTUH</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>NAAC &apos;A&apos; Grade Accredited</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">TG EAPCET Code:</span>
                  <span className="font-bold text-indigo-900 dark:text-indigo-400">KPRT</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">ECET Code:</span>
                  <span className="font-bold text-indigo-900 dark:text-indigo-400">KPRT</span>
                </div>
              </div>
              <a
                href="https://kpritech.ac.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 hover:underline"
              >
                <span>Visit kpritech.ac.in</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} Kommuri Pratap Reddy Institute of Technology (KPRIT). All Rights Reserved.</p>
          <div className="flex items-center gap-3">
            <span>Student Campus Platform</span>
            <span>&bull;</span>
            <span>Designed for College Deployment</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
