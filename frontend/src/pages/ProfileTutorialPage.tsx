import { ProfileTutorialPageView } from "./user/tutorials/components/ProfileTutorialPageView";
import { useProfileTutorialPage } from "./user/tutorials/hooks/useProfileTutorialPage";

const ProfileTutorialPage = () => {
  const profileTutorialPage = useProfileTutorialPage();

  return <ProfileTutorialPageView {...profileTutorialPage} />;
};

export default ProfileTutorialPage;
