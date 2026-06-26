import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { passkeyClient, type RegisteredPasskey } from "@/integrations/api/PasskeyClient";
import { profileClient } from "@/integrations/api/ProfileClient";
import { uploadClient } from "@/integrations/api/UploadClient";
import {
  canUsePasskeys,
  getDefaultPasskeyDeviceLabel,
  startPasskeyRegistration,
} from "@/lib/passkeys/browser";
import {
  clearStoredLocalPasskey,
  storeLocalPasskey,
} from "@/lib/passkeys/localUnlock";
import { applyTheme } from "@/lib/themePreference";
import type { ProfileDialogKey, ProfileDialogState } from "../types";
import { applyLocalDeviceReady, getProfileInitials } from "../utils/profilePage";

const INITIAL_DIALOG_STATE: ProfileDialogState = {
  showPrivacyDialog: false,
  showSignOutConfirm: false,
  showTermsDialog: false,
};

export function useProfilePage() {
  const navigate = useNavigate();
  const {
    user,
    profile,
    profileStatus,
    isAdmin,
    updateEmail,
    updatePassword,
    signOut,
    setProfileState,
  } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingInspectPreference, setIsSavingInspectPreference] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
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
  const isShowingDetailedResults = Boolean(profile?.show_detailed_results);
  const roleLabel = isAdmin ? "Administrator" : "Inspector";
  const isLoading = profileStatus === "loading" || (Boolean(user) && !profile);

  const loadPasskeys = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    setEmail(user?.email ?? "");
  }, [user?.email]);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  useEffect(() => {
    const isDarkMode = Boolean(profile?.is_dark_mode);
    setIsLightMode(!isDarkMode);
  }, [profile?.is_dark_mode]);

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
    void loadPasskeys();
  }, [loadPasskeys, user]);

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

    setIsSavingProfile(true);
    try {
      let changed = false;

      if (trimmedName !== (profile?.full_name ?? "")) {
        const updatedProfile = await profileClient.updateProfile(user.id, {
          full_name: trimmedName || null,
        });
        setProfileState(updatedProfile);
        changed = true;
      }

      if (trimmedEmail && trimmedEmail !== (user.email ?? "")) {
        await updateEmail(trimmedEmail);
        changed = true;
        toast.success("Email updated");
      }

      if (!changed) {
        toast.message("No profile changes to save");
        return;
      }

      if (trimmedEmail === (user.email ?? "")) {
        toast.success("Profile updated");
      }
    } catch (error) {
      console.error("Save profile failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  }, [email, fullName, profile?.full_name, setProfileState, updateEmail, user]);

  const handleUpdatePassword = useCallback(async () => {
    if (!password.trim()) {
      toast.error("Enter a new password");
      return;
    }

    if (password.trim().length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSavingPassword(true);
    try {
      await updatePassword(password.trim());
      setPassword("");
      toast.success("Password updated");
    } catch (error) {
      console.error("Password update failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setIsSavingPassword(false);
    }
  }, [password, updatePassword]);

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

  const handleThemeToggle = useCallback(async () => {
    if (!user) return;

    const nextIsDarkMode = isLightMode;

    try {
      const updatedProfile = await profileClient.updateProfile(user.id, {
        is_dark_mode: nextIsDarkMode,
      });
      setProfileState(updatedProfile);
      setIsLightMode(!nextIsDarkMode);
      applyTheme(nextIsDarkMode);
      toast.success(nextIsDarkMode ? "Dark mode enabled" : "Light mode enabled");
    } catch (error) {
      console.error("Theme update failed:", error);
      toast.error("Failed to update theme preference");
    }
  }, [isLightMode, setProfileState, user]);

  const handleDetailedResultsToggle = useCallback(async (checked: boolean) => {
    if (!user) return;

    setIsSavingInspectPreference(true);
    try {
      const updatedProfile = await profileClient.updateProfile(user.id, {
        show_detailed_results: checked,
      });
      setProfileState(updatedProfile);
      toast.success(
        checked
          ? "Detailed inspect results enabled"
          : "Simplified inspect results enabled",
      );
    } catch (error) {
      console.error("Inspect result preference update failed:", error);
      toast.error("Failed to update inspect result preference");
    } finally {
      setIsSavingInspectPreference(false);
    }
  }, [setProfileState, user]);

  const handleRegisterPasskey = useCallback(async () => {
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
        storeLocalPasskey({
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
  }, [isAdmin]);

  const handleRemovePasskey = useCallback(async (credentialId: string) => {
    setRemovingCredentialId(credentialId);
    try {
      await passkeyClient.deletePasskey(credentialId);
      clearStoredLocalPasskey(credentialId);
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
  }, []);

  return {
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
    navigateBack: () => navigate(-1),
    openHelpTutorials: () => navigate("/profile/help"),
    openProfileTutorial: () => navigate("/profile/tutorial"),
  };
}
