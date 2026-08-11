import {
  ProfileTutorialPageView,
  useProfileTutorialPage,
} from "@/features/tutorials";

const ProfileTutorialPage = () => {
  const profileTutorialPage = useProfileTutorialPage();

  return <ProfileTutorialPageView {...profileTutorialPage} />;
};

export default ProfileTutorialPage;
