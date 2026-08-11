import { TutorialPlayer } from "@/components/tutorial/TutorialPlayer";
import { firstRunOnboardingSteps } from "@/lib/tutorials/tutorialDefinitions";
import {
  OnboardingPageView,
  ONBOARDING_COMPLETION_BODY,
  ONBOARDING_COMPLETION_TITLE,
  ONBOARDING_FINISH_LABEL,
  useOnboarding,
} from "@/features/onboarding";

const OnboardingPage = () => {
  const onboardingPage = useOnboarding();

  return (
    <OnboardingPageView
      {...onboardingPage}
      tutorial={
        <TutorialPlayer
          steps={firstRunOnboardingSteps}
          finishLabel={ONBOARDING_FINISH_LABEL}
          completionTitle={ONBOARDING_COMPLETION_TITLE}
          completionBody={ONBOARDING_COMPLETION_BODY}
          onFinish={onboardingPage.onFinish}
          onSkip={onboardingPage.onSkip}
          isBusy={onboardingPage.isBusy}
          errorMessage={onboardingPage.errorMessage}
          secondaryAction={onboardingPage.secondaryAction}
        />
      }
    />
  );
};

export default OnboardingPage;
