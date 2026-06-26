import { ProfileHelpPageView } from "./user/tutorials/components/ProfileHelpPageView";
import { useProfileHelpPage } from "./user/tutorials/hooks/useProfileHelpPage";

const ProfileHelpPage = () => {
  const profileHelpPage = useProfileHelpPage();

  return <ProfileHelpPageView {...profileHelpPage} />;
};

export default ProfileHelpPage;
