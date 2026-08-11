import { ProfileTutorialPageView } from "@/pages/user/tutorials/components/ProfileTutorialPageView";
import { useProfileTutorialPage } from "@/pages/user/tutorials/hooks/useProfileTutorialPage";

const ProfileTutorialPage = () => {
  const profileTutorialPage = useProfileTutorialPage();

  return <ProfileTutorialPageView {...profileTutorialPage} />;
};

export default ProfileTutorialPage;
