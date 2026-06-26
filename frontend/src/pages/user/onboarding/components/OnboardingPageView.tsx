import { TutorialPlayer } from "@/components/tutorial/TutorialPlayer";
import { firstRunOnboardingSteps } from "@/lib/tutorials/tutorialDefinitions";
import type { OnboardingPageViewModel } from "../types";
import {
  ONBOARDING_COMPLETION_BODY,
  ONBOARDING_COMPLETION_TITLE,
  ONBOARDING_FINISH_LABEL,
} from "../utils/onboardingPage";

type OnboardingPageViewProps = OnboardingPageViewModel;

export function OnboardingPageView({
  errorMessage,
  isBusy,
  onFinish,
  onSkip,
  secondaryAction,
}: OnboardingPageViewProps) {
  return (
    <TutorialPlayer
      steps={firstRunOnboardingSteps}
      finishLabel={ONBOARDING_FINISH_LABEL}
      completionTitle={ONBOARDING_COMPLETION_TITLE}
      completionBody={ONBOARDING_COMPLETION_BODY}
      onSkip={onSkip}
      onFinish={onFinish}
      isBusy={isBusy}
      errorMessage={errorMessage}
      secondaryAction={secondaryAction}
    />
  );
}
