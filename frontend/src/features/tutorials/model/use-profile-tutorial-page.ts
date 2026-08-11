import { useNavigate } from "react-router-dom";
import type { ProfileTutorialPageViewModel } from "./profile-tutorial-page-types";
import { PROFILE_TUTORIAL_SECONDARY_ACTION_LABEL } from "./profile-tutorial-page";

export function useProfileTutorialPage(): ProfileTutorialPageViewModel {
  const navigate = useNavigate();

  return {
    onFinish: () => navigate("/profile"),
    onSkip: () => navigate("/profile"),
    secondaryAction: {
      label: PROFILE_TUTORIAL_SECONDARY_ACTION_LABEL,
      onClick: () => navigate("/profile/help"),
    },
  };
}
