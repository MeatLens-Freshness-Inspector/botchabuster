import { Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PrivacyPolicyDialog } from "@/components/PrivacyPolicyDialog";
import { TermsAndConditionsDialog } from "@/components/TermsAndConditionsDialog";
import { useProfilePage } from "../hooks/useProfilePage";
import { ProfilePageHeader } from "./ProfilePageHeader";
import { ProfilePrimaryColumn } from "./ProfilePrimaryColumn";
import { ProfileSecondaryColumn } from "./ProfileSecondaryColumn";
import { ProfileSummaryCard } from "./ProfileSummaryCard";

export function ProfilePageView() {
  const {
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
        <ProfilePageHeader />

        <ProfileSummaryCard
          fullName={fullName}
          initials={initials}
          inspectorCode={inspectorCode}
          isUploadingAvatar={isUploadingAvatar}
          onAvatarUpload={handleAvatarUpload}
          onCopyCode={handleCopyCode}
          profile={profile}
          roleLabel={roleLabel}
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.98fr_1.02fr]">
          <ProfilePrimaryColumn
            email={email}
            fullName={fullName}
            inspectorCode={inspectorCode}
            isLightMode={isLightMode}
            isLoadingPasskeys={isLoadingPasskeys}
            isRegisteringPasskey={isRegisteringPasskey}
            isSavingPassword={isSavingPassword}
            isSavingProfile={isSavingProfile}
            isShowingDetailedResults={isShowingDetailedResults}
            isUploadingAvatar={isUploadingAvatar}
            passkeyAvailable={passkeyAvailable}
            passkeys={passkeys}
            password={password}
            removingCredentialId={removingCredentialId}
            onEmailChange={setEmail}
            onFullNameChange={setFullName}
            onOpenHelpTutorials={openHelpTutorials}
            onOpenProfileTutorial={openProfileTutorial}
            onPasswordChange={setPassword}
            onRegisterPasskey={handleRegisterPasskey}
            onRemovePasskey={handleRemovePasskey}
            onSaveProfile={handleSaveProfile}
            onUpdatePassword={handleUpdatePassword}
          />

          <ProfileSecondaryColumn
            isLightMode={isLightMode}
            isSavingInspectPreference={isSavingInspectPreference}
            isShowingDetailedResults={isShowingDetailedResults}
            onDetailedResultsToggle={handleDetailedResultsToggle}
            onOpenPrivacyDialog={() => setDialogOpen("showPrivacyDialog", true)}
            onOpenSignOutConfirm={() => setDialogOpen("showSignOutConfirm", true)}
            onOpenTermsDialog={() => setDialogOpen("showTermsDialog", true)}
            onThemeToggle={handleThemeToggle}
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
}
