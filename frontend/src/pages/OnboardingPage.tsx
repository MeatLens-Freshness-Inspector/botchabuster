import { OnboardingPageView } from "./user/onboarding/components/OnboardingPageView";
import { useOnboarding } from "@/features/onboarding";

const OnboardingPage = () => {
  const onboardingPage = useOnboarding();

  return <OnboardingPageView {...onboardingPage} />;
};

export default OnboardingPage;
