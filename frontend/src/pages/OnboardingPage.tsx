import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { TutorialPlayer } from "@/components/tutorial/TutorialPlayer";
import { useAuth } from "@/contexts/AuthContext";
import { profileClient } from "@/integrations/api/ProfileClient";
import {
  clearOnboardingSkippedForSession,
  markOnboardingSkippedForSession,
} from "@/lib/onboardingSession";
import { firstRunOnboardingSteps } from "@/lib/tutorials/tutorialDefinitions";

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, setProfileState } = useAuth();
  const [stepError, setStepError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleSkipForNow = () => {
    if (!user) return;

    markOnboardingSkippedForSession(user.id);
    navigate("/inspect", { replace: true });
  };

  const handleFinish = async () => {
    if (!user) return;

    setIsCompleting(true);
    setStepError(null);

    try {
      const updatedProfile = await profileClient.updateProfile(user.id, {
        onboarding_completed_at: new Date().toISOString(),
      });
      clearOnboardingSkippedForSession(user.id);
      setProfileState(updatedProfile);
      navigate("/inspect", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to finish onboarding";
      setStepError(message);
      toast.error(message);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <TutorialPlayer
      steps={firstRunOnboardingSteps}
      finishLabel="Start Inspecting"
      completionTitle="You're ready to inspect"
      completionBody="You can start using MeatLens now and replay these demos later from Profile > Help."
      onSkip={handleSkipForNow}
      onFinish={() => void handleFinish()}
      isBusy={isCompleting}
      errorMessage={stepError}
      secondaryAction={{
        label: "Open Help",
        onClick: () => navigate("/profile/help"),
      }}
    />
  );
};

export default OnboardingPage;
