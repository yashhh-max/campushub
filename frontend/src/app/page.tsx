import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { EventsPreview } from "@/components/landing/EventsPreview";
import { OpportunitiesSection } from "@/components/landing/OpportunitiesSection";
import { ClubsPreview } from "@/components/landing/ClubsPreview";
import { AnnouncementsTicker } from "@/components/landing/AnnouncementsTicker";
import { CampusLifeSection } from "@/components/landing/CampusLifeSection";
import { CommunitySection } from "@/components/landing/CommunitySection";
import { CTASection } from "@/components/landing/CTASection";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-transparent text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      <main className="flex-1">
        <Hero />
        <AnnouncementsTicker />
        <Features />
        <EventsPreview />
        <OpportunitiesSection />
        <ClubsPreview />
        <CampusLifeSection />
        <CommunitySection />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
