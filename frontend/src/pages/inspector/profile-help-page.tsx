import { ProfileHelpPageView } from "@/pages/user/tutorials/components/ProfileHelpPageView";
import { useProfileHelpPage } from "@/pages/user/tutorials/hooks/useProfileHelpPage";

const ProfileHelpPage = () => {
  const profileHelpPage = useProfileHelpPage();

  return <ProfileHelpPageView {...profileHelpPage} />;
};

export default ProfileHelpPage;
