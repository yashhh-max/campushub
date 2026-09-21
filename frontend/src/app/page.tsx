import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { EventsPreview } from "@/components/landing/EventsPreview";
import { ClubsPreview } from "@/components/landing/ClubsPreview";
import { AnnouncementsTicker } from "@/components/landing/AnnouncementsTicker";
import { CommunitySection } from "@/components/landing/CommunitySection";
import { CTASection } from "@/components/landing/CTASection";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      <main className="flex-1">
        <Hero />
        <AnnouncementsTicker />
        <Features />
        <EventsPreview />
        <ClubsPreview />
        <CommunitySection />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
