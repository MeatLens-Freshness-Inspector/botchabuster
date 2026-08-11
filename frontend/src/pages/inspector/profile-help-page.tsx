import {
  ProfileHelpPageView,
  useProfileHelpPage,
} from "@/features/tutorials";

const ProfileHelpPage = () => {
  const profileHelpPage = useProfileHelpPage();

  return <ProfileHelpPageView {...profileHelpPage} />;
};

export default ProfileHelpPage;
