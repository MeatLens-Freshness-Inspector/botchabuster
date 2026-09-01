import { useAuth } from "@/entities/user";
import "./landing-page.css";
import {
  BottomCtaSection,
  FeaturesSection,
  HeroSection,
  LandingFooter,
  LandingHeader,
  LogTicker,
  WorkflowSection,
} from "@/widgets/public-landing";
import { useLandingStats } from "@/features/public-landing";

const LandingPage = () => {
  const { user } = useAuth();
  const { statCards } = useLandingStats();
  const isSignedIn = Boolean(user);

  return (
    <div className="landing-page min-h-screen overflow-x-hidden selection:bg-orange-100 selection:text-[#17191c]">
      <LandingHeader isSignedIn={isSignedIn} />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <HeroSection isSignedIn={isSignedIn} statCards={statCards} />

        <div className="mb-20">
          <LogTicker />
        </div>

        <WorkflowSection />
        <FeaturesSection />
        <BottomCtaSection isSignedIn={isSignedIn} />
      </main>

      <LandingFooter />
    </div>
  );
};

export default LandingPage;
