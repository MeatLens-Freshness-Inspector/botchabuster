import { OnboardingPageView } from "./user/onboarding/components/OnboardingPageView";
import { useOnboardingPage } from "./user/onboarding/hooks/useOnboardingPage";

const OnboardingPage = () => {
  const onboardingPage = useOnboardingPage();

  return <OnboardingPageView {...onboardingPage} />;
};

export default OnboardingPage;
