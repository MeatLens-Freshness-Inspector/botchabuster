import { useAuth } from "@/contexts/AuthContext";
import { BottomCtaSection } from "./landing/landing-page/components/BottomCtaSection";
import { FeaturesSection } from "./landing/landing-page/components/FeaturesSection";
import { HeroSection } from "./landing/landing-page/components/HeroSection";
import { LandingFooter } from "./landing/landing-page/components/LandingFooter";
import { LandingHeader } from "./landing/landing-page/components/LandingHeader";
import { LogTicker } from "./landing/landing-page/components/LogTicker";
import { TestimonialsSection } from "./landing/landing-page/components/TestimonialsSection";
import { WorkflowSection } from "./landing/landing-page/components/WorkflowSection";
import { useLandingStats } from "./landing/landing-page/hooks/useLandingStats";

const LandingPage = () => {
  const { user } = useAuth();
  const { statCards } = useLandingStats();
  const isSignedIn = Boolean(user);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/30">
      <div className="pointer-events-none absolute left-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 opacity-50 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-5%] top-[20%] h-[400px] w-[400px] rounded-full bg-accent/5 opacity-50 blur-[120px]" />

      <LandingHeader isSignedIn={isSignedIn} />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <HeroSection isSignedIn={isSignedIn} statCards={statCards} />

        <div className="mb-20">
          <LogTicker />
        </div>

        <WorkflowSection />
        <FeaturesSection />
        <TestimonialsSection />
        <BottomCtaSection isSignedIn={isSignedIn} />
      </main>

      <LandingFooter />
    </div>
  );
};

export default LandingPage;
