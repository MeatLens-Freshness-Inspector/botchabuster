import { firstRunOnboardingSteps } from "../model/inspection-tutorial";
import { TutorialPlayer } from "./tutorial-player";
import type { ProfileTutorialPageViewModel } from "../model/profile-tutorial-page-types";
import {
  PROFILE_TUTORIAL_COMPLETION_BODY,
  PROFILE_TUTORIAL_COMPLETION_TITLE,
  PROFILE_TUTORIAL_FINISH_LABEL,
} from "../model/profile-tutorial-page";

type ProfileTutorialPageViewProps = ProfileTutorialPageViewModel;

export function ProfileTutorialPageView({
  onFinish,
  onSkip,
  secondaryAction,
}: ProfileTutorialPageViewProps) {
  return (
    <TutorialPlayer
      steps={firstRunOnboardingSteps}
      finishLabel={PROFILE_TUTORIAL_FINISH_LABEL}
      completionTitle={PROFILE_TUTORIAL_COMPLETION_TITLE}
      completionBody={PROFILE_TUTORIAL_COMPLETION_BODY}
      onFinish={onFinish}
      onSkip={onSkip}
      secondaryAction={secondaryAction}
    />
  );
}
