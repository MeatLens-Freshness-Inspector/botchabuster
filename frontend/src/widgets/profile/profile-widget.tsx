import { Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import {
  PrivacyPolicyDialog,
  TermsAndConditionsDialog,
} from "@/widgets/legal";
import { useProfileEditor } from "@/features/profile-editing";
import { ProfilePageHeader } from "./profile-page-header";
import { ProfilePrimaryColumn } from "@/widgets/profile/profile-primary-column";
import { ProfileSecondaryColumn } from "@/widgets/profile/profile-secondary-column";
import { ProfileSummaryCard } from "@/entities/user";

export function ProfilePageView() {
  const {
    profile,
    fullName,
    email,
    location,
    reportOrganization,
    currentPassword,
    newPassword,
    confirmPassword,
    isLoading,
    isSavingProfile,
    isSavingPassword,
    isUploadingAvatar,
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
    setLocation,
    setReportOrganization,
    setIsLightMode,
    setIsShowingDetailedResults,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    setDialogOpen,
    handleAvatarUpload,
    handleSaveProfile,
    handleUpdatePassword,
    handleCopyCode,
    handleSignOut,
    handleRegisterPasskey,
    handleRemovePasskey,
    openHelpTutorials,
    openProfileTutorial,
  } = useProfileEditor();

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
        <ProfilePageHeader
          roleLabel={roleLabel}
          inspectorCode={inspectorCode}
          passkeysCount={passkeys.length}
        />

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
            location={location}
            reportOrganization={reportOrganization}
            isLightMode={isLightMode}
            isLoadingPasskeys={isLoadingPasskeys}
            isRegisteringPasskey={isRegisteringPasskey}
            isSavingPassword={isSavingPassword}
            isSavingProfile={isSavingProfile}
            isShowingDetailedResults={isShowingDetailedResults}
            isUploadingAvatar={isUploadingAvatar}
            passkeyAvailable={passkeyAvailable}
            passkeys={passkeys}
            currentPassword={currentPassword}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            removingCredentialId={removingCredentialId}
            onEmailChange={setEmail}
            onFullNameChange={setFullName}
            onLocationChange={setLocation}
            onReportOrganizationChange={setReportOrganization}
            onLightModeChange={setIsLightMode}
            onDetailedResultsChange={setIsShowingDetailedResults}
            onOpenHelpTutorials={openHelpTutorials}
            onOpenProfileTutorial={openProfileTutorial}
            onCurrentPasswordChange={setCurrentPassword}
            onNewPasswordChange={setNewPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onRegisterPasskey={handleRegisterPasskey}
            onRemovePasskey={handleRemovePasskey}
            onSaveProfile={handleSaveProfile}
            onUpdatePassword={handleUpdatePassword}
          />

          <ProfileSecondaryColumn
            onOpenPrivacyDialog={() => setDialogOpen("showPrivacyDialog", true)}
            onOpenSignOutConfirm={() => setDialogOpen("showSignOutConfirm", true)}
            onOpenTermsDialog={() => setDialogOpen("showTermsDialog", true)}
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
