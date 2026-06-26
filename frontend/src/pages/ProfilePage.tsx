import { Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PrivacyPolicyDialog } from "@/components/PrivacyPolicyDialog";
import { TermsAndConditionsDialog } from "@/components/TermsAndConditionsDialog";
import { ProfilePageHeader } from "./profile/components/ProfilePageHeader";
import { ProfileOverviewColumn } from "./profile/components/ProfileOverviewColumn";
import { ProfileSettingsColumn } from "./profile/components/ProfileSettingsColumn";
import { useProfilePage } from "./profile/hooks/useProfilePage";

const ProfilePage = () => {
  const {
    user,
    profile,
    fullName,
    email,
    password,
    isLoading,
    isSavingProfile,
    isSavingPassword,
    isUploadingAvatar,
    isSavingInspectPreference,
    isLightMode,
    dialogs,
    passkeyAvailable,
    passkeys,
    isLoadingPasskeys,
    isRegisteringPasskey,
    removingCredentialId,
    initials,
    inspectorCode,
    isShowingDetailedResults,
    roleLabel,
    setFullName,
    setEmail,
    setPassword,
    setDialogOpen,
    handleAvatarUpload,
    handleSaveProfile,
    handleUpdatePassword,
    handleCopyCode,
    handleSignOut,
    handleThemeToggle,
    handleDetailedResultsToggle,
    handleRegisterPasskey,
    handleRemovePasskey,
    navigateBack,
    openHelpTutorials,
    openProfileTutorial,
  } = useProfilePage();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4">
        <ProfilePageHeader onBack={navigateBack} />

        <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <ProfileOverviewColumn
            email={email}
            fullName={fullName}
            initials={initials}
            inspectorCode={inspectorCode}
            isLightMode={isLightMode}
            isShowingDetailedResults={isShowingDetailedResults}
            isUploadingAvatar={isUploadingAvatar}
            onAvatarUpload={handleAvatarUpload}
            onCopyCode={handleCopyCode}
            onOpenHelpTutorials={openHelpTutorials}
            onOpenPrivacyDialog={() => setDialogOpen("showPrivacyDialog", true)}
            onOpenProfileTutorial={openProfileTutorial}
            onOpenTermsDialog={() => setDialogOpen("showTermsDialog", true)}
            profile={profile}
            roleLabel={roleLabel}
            userEmail={user?.email}
          />

          <ProfileSettingsColumn
            email={email}
            fullName={fullName}
            isLightMode={isLightMode}
            isLoadingPasskeys={isLoadingPasskeys}
            isRegisteringPasskey={isRegisteringPasskey}
            isSavingInspectPreference={isSavingInspectPreference}
            isSavingPassword={isSavingPassword}
            isSavingProfile={isSavingProfile}
            isShowingDetailedResults={isShowingDetailedResults}
            isUploadingAvatar={isUploadingAvatar}
            passkeyAvailable={passkeyAvailable}
            passkeys={passkeys}
            password={password}
            removingCredentialId={removingCredentialId}
            onDetailedResultsToggle={handleDetailedResultsToggle}
            onEmailChange={setEmail}
            onFullNameChange={setFullName}
            onOpenSignOutConfirm={() => setDialogOpen("showSignOutConfirm", true)}
            onPasswordChange={setPassword}
            onRegisterPasskey={handleRegisterPasskey}
            onRemovePasskey={handleRemovePasskey}
            onSaveProfile={handleSaveProfile}
            onThemeToggle={handleThemeToggle}
            onUpdatePassword={handleUpdatePassword}
          />
        </div>
      </div>

      <ConfirmDialog
        open={dialogs.showSignOutConfirm}
        onOpenChange={(open) => setDialogOpen("showSignOutConfirm", open)}
        title="Sign out?"
        description="Are you sure you want to sign out of your account?"
        confirmLabel="Sign Out"
        onConfirm={handleSignOut}
      />
      <TermsAndConditionsDialog
        open={dialogs.showTermsDialog}
        onOpenChange={(open) => setDialogOpen("showTermsDialog", open)}
      />
      <PrivacyPolicyDialog
        open={dialogs.showPrivacyDialog}
        onOpenChange={(open) => setDialogOpen("showPrivacyDialog", open)}
      />
    </div>
  );
};

export default ProfilePage;
