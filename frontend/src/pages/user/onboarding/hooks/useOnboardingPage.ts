import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { profileClient } from "@/integrations/api/ProfileClient";
import {
  clearOnboardingSkippedForSession,
  markOnboardingSkippedForSession,
} from "@/lib/onboardingSession";
import type { OnboardingPageViewModel } from "../types";
import {
  getOnboardingErrorMessage,
  ONBOARDING_SECONDARY_ACTION_LABEL,
} from "../utils/onboardingPage";

export function useOnboardingPage(): OnboardingPageViewModel {
  const navigate = useNavigate();
  const { user, setProfileState } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const onSkip = () => {
    if (!user) return;

    markOnboardingSkippedForSession(user.id);
    navigate("/inspect", { replace: true });
  };

  const onFinish = () => {
    void (async () => {
      if (!user) return;

      setIsBusy(true);
      setErrorMessage(null);

      try {
        const updatedProfile = await profileClient.updateProfile(user.id, {
          onboarding_completed_at: new Date().toISOString(),
        });
        clearOnboardingSkippedForSession(user.id);
        setProfileState(updatedProfile);
        navigate("/inspect", { replace: true });
      } catch (error) {
        const message = getOnboardingErrorMessage(error);
        setErrorMessage(message);
        toast.error(message);
      } finally {
        setIsBusy(false);
      }
    })();
  };

  return {
    errorMessage,
    isBusy,
    onFinish,
    onSkip,
    secondaryAction: {
      label: ONBOARDING_SECONDARY_ACTION_LABEL,
      onClick: () => navigate("/profile/help"),
    },
  };
}
