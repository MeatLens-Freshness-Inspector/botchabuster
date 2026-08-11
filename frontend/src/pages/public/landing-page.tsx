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
