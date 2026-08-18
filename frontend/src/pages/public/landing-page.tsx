import { useAuth } from "@/entities/user";
import {
  BottomCtaSection,
  FeaturesSection,
  HeroSection,
  LandingFooter,
  LandingHeader,
  LogTicker,
  TestimonialsSection,
  WorkflowSection,
} from "@/widgets/public-landing";
import { useLandingStats } from "@/features/public-landing";

const LandingPage = () => {
  const { user } = useAuth();
  const { statCards } = useLandingStats();
  const isSignedIn = Boolean(user);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/30">
      <LandingHeader isSignedIn={isSignedIn} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <HeroSection isSignedIn={isSignedIn} statCards={statCards} />

        <LogTicker />

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
