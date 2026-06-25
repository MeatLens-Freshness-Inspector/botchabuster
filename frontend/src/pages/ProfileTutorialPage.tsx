import { useNavigate } from "react-router-dom";
import { TutorialPlayer } from "@/components/tutorial/TutorialPlayer";
import { firstRunOnboardingSteps } from "@/lib/tutorials/tutorialDefinitions";

const ProfileTutorialPage = () => {
  const navigate = useNavigate();

  return (
    <TutorialPlayer
      steps={firstRunOnboardingSteps}
      finishLabel="Back to Profile"
      completionTitle="Tutorial replay complete"
      completionBody="This replay used simulated data only and did not change your account."
      onFinish={() => navigate("/profile")}
      onSkip={() => navigate("/profile")}
      secondaryAction={{
        label: "Open Help",
        onClick: () => navigate("/profile/help"),
      }}
    />
  );
};

export default ProfileTutorialPage;
