import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/entities/user";
import type { ReportOrganization } from "@/entities/user/api/profile-client";
import {
  passkeyClient,
  startPasskeyRegistration,
  type RegisteredPasskey,
} from "@/features/passkeys";
import { profileClient } from "@/entities/user/api";
import { uploadClient } from "@/features/inspection-submission";
import {
  canUsePasskeys,
  getDefaultPasskeyDeviceLabel,
} from "@/features/passkeys";
import {
  clearStoredLocalPasskey,
  storeLocalPasskey,
} from "@/features/passkeys";
import { applyTheme } from "@/shared/lib/theme-preference";
import {
  createProfileDialogState,
  type ProfileDialogKey,
  type ProfileDialogState,
} from "@/entities/user";
import { applyLocalDeviceReady, getProfileInitials } from "./profile-page";
import {
  buildProfileSettingsUpdate,
  validatePasswordChange,
} from "./profile-settings";

const INITIAL_DIALOG_STATE: ProfileDialogState = createProfileDialogState();

export function useProfileEditor() {
  const navigate = useNavigate();
  const {
    user,
    profile,
    profileStatus,
    isAdmin,
    isOnlineAuthenticated,
    updateEmail,
    updatePassword,
    signOut,
    setProfileState,
  } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [reportOrganization, setReportOrganization] = useState<ReportOrganization | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [isShowingDetailedResults, setIsShowingDetailedResults] = useState(false);
  const [dialogs, setDialogs] = useState<ProfileDialogState>(INITIAL_DIALOG_STATE);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [passkeys, setPasskeys] = useState<RegisteredPasskey[]>([]);
  const [isLoadingPasskeys, setIsLoadingPasskeys] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [removingCredentialId, setRemovingCredentialId] = useState<string | null>(null);

  const initials = useMemo(
    () => getProfileInitials(fullName, user?.email),
    [fullName, user?.email],
  );

  const inspectorCode = profile?.inspector_code || "No assigned inspector code";
  const roleLabel = isAdmin ? "Administrator" : "Inspector";
  const isLoading = profileStatus === "loading" || (Boolean(user) && !profile);

  const loadPasskeys = useCallback(async () => {
    if (!isOnlineAuthenticated) {
      setPasskeys([]);
      return;
    }

    setIsLoadingPasskeys(true);

    try {
      const registeredPasskeys = await passkeyClient.listPasskeys();
      setPasskeys(applyLocalDeviceReady(registeredPasskeys));
    } catch (error) {
      console.error("Failed to load registered passkeys:", error);
      toast.error("Failed to load passkeys");
    } finally {
      setIsLoadingPasskeys(false);
    }
  }, [isOnlineAuthenticated]);

  useEffect(() => {
    setEmail(user?.email ?? "");
  }, [user?.email]);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  useEffect(() => {
    setLocation(profile?.location ?? "");
  }, [profile?.location]);

  useEffect(() => {
    setReportOrganization(profile?.report_organization ?? null);
  }, [profile?.report_organization]);

  useEffect(() => {
    const isDarkMode = Boolean(profile?.is_dark_mode);
    setIsLightMode(!isDarkMode);
  }, [profile?.is_dark_mode]);

  useEffect(() => {
    setIsShowingDetailedResults(Boolean(profile?.show_detailed_results));
  }, [profile?.show_detailed_results]);

  useEffect(() => {
    let mounted = true;

    const checkPasskeyAvailability = async () => {
      const supported = await canUsePasskeys();
      if (mounted) {
        setPasskeyAvailable(supported);
      }
    };

    void checkPasskeyAvailability();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!isOnlineAuthenticated) {
      setPasskeys([]);
      return;
    }
    void loadPasskeys();
  }, [isOnlineAuthenticated, loadPasskeys, user]);

  const setDialogOpen = useCallback((key: ProfileDialogKey, open: boolean) => {
    setDialogs((current) => ({
      ...current,
      [key]: open,
    }));
  }, []);

  const handleAvatarUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAvatar(true);
    try {
      const avatarUrl = await uploadClient.uploadInspectionImage(file, user.id);
      const updated = await profileClient.updateProfile(user.id, { avatar_url: avatarUrl });
      setProfileState(updated);
      toast.success("Profile image updated");
    } catch (error) {
      console.error("Avatar upload failed:", error);
      toast.error("Failed to upload profile image");
    } finally {
      event.target.value = "";
      setIsUploadingAvatar(false);
    }
  }, [setProfileState, user]);

  const handleSaveProfile = useCallback(async () => {
    if (!user) return;

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      toast.error("Email is required");
      return;
    }

    setIsSavingProfile(true);
    try {
      const profileUpdate = buildProfileSettingsUpdate({
        fullName,
        email,
        location,
        reportOrganization,
        isLightMode,
        isShowingDetailedResults,
      }, profile ?? {
        id: user.id,
        full_name: null,
        avatar_url: null,
        inspector_code: null,
        report_organization: null,
        is_dark_mode: null,
        show_detailed_results: null,
        onboarding_completed_at: null,
        onboarding_version: 1,
        location: null,
        created_at: "",
        updated_at: "",
      });

      const profileChanged = Object.entries(profileUpdate).some(([key, value]) => {
        const profileKey = key as keyof typeof profileUpdate;
        const currentValue = profile?.[profileKey];
        return value !== currentValue;
      });

      if (profileChanged) {
        const updatedProfile = await profileClient.updateProfile(user.id, profileUpdate);
        setProfileState(updatedProfile);
        applyTheme(Boolean(updatedProfile.is_dark_mode));
      }

      if (trimmedEmail && trimmedEmail !== (user.email ?? "")) {
        await updateEmail(trimmedEmail);
      }

      if (!profileChanged && trimmedEmail === (user.email ?? "")) {
        toast.message("No profile changes to save");
        return;
      }

      toast.success("Profile updated");
    } catch (error) {
      console.error("Save profile failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  }, [email, fullName, isLightMode, isShowingDetailedResults, location, profile, reportOrganization, setProfileState, updateEmail, user]);

  const handleUpdatePassword = useCallback(async () => {
    const validationError = validatePasswordChange({ currentPassword, newPassword, confirmPassword });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSavingPassword(true);
    try {
      await updatePassword(currentPassword.trim(), newPassword.trim());
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (error) {
      console.error("Password update failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setIsSavingPassword(false);
    }
  }, [confirmPassword, currentPassword, newPassword, updatePassword]);

  const handleCopyCode = useCallback(async () => {
    const code = profile?.inspector_code?.trim();
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      toast.success("Inspector code copied");
    } catch {
      toast.error("Failed to copy inspector code");
    }
  }, [profile?.inspector_code]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Sign out failed:", error);
      toast.error("Failed to sign out");
    }
  }, [navigate, signOut]);

  const handleRegisterPasskey = useCallback(async () => {
    if (!isOnlineAuthenticated) {
      toast.error("Reconnect and sign in online before enrolling a passkey.");
      return;
    }

    setIsRegisteringPasskey(true);
    try {
      const { challengeId, options } = await passkeyClient.getRegistrationOptions();
      const credential = await startPasskeyRegistration(options);
      const createdPasskey = await passkeyClient.verifyRegistration({
        challengeId,
        credential,
        deviceLabel: getDefaultPasskeyDeviceLabel(),
      });

      if (
        credential.response.publicKey &&
        typeof credential.response.publicKeyAlgorithm === "number"
      ) {
        await storeLocalPasskey({
          credentialId: createdPasskey.credentialId,
          publicKey: credential.response.publicKey,
          publicKeyAlgorithm: credential.response.publicKeyAlgorithm,
          transports: createdPasskey.transports,
          deviceLabel: createdPasskey.deviceLabel,
          rpId: window.location.hostname,
          counter: 0,
          isAdmin,
        });
      }

      setPasskeys((currentPasskeys) =>
        applyLocalDeviceReady([
          createdPasskey,
          ...currentPasskeys.filter(
            (entry) => entry.credentialId !== createdPasskey.credentialId,
          ),
        ]),
      );
      toast.success("Passkey enrolled for this device");
    } catch (error) {
      console.error("Passkey registration failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to enroll passkey");
    } finally {
      setIsRegisteringPasskey(false);
    }
  }, [isAdmin, isOnlineAuthenticated]);

  const handleRemovePasskey = useCallback(async (credentialId: string) => {
    if (!isOnlineAuthenticated) {
      toast.error("Reconnect and sign in online before removing a passkey.");
      return;
    }

    setRemovingCredentialId(credentialId);
    try {
      await passkeyClient.deletePasskey(credentialId);
      await clearStoredLocalPasskey(credentialId);
      setPasskeys((currentPasskeys) =>
        currentPasskeys.filter((entry) => entry.credentialId !== credentialId),
      );
      toast.success("Passkey removed");
    } catch (error) {
      console.error("Passkey removal failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove passkey");
    } finally {
      setRemovingCredentialId(null);
    }
  }, [isOnlineAuthenticated]);

  return {
    user,
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
    openHelpTutorials: () => navigate("/profile/help"),
    openProfileTutorial: () => navigate("/profile/tutorial"),
  };
}
