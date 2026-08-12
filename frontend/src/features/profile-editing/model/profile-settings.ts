import type { Profile, ReportOrganization } from "@/entities/user/api/profile-client";

export interface ProfileSettingsForm {
  fullName: string;
  email: string;
  location: string;
  reportOrganization: ReportOrganization | null;
  isLightMode: boolean;
  isShowingDetailedResults: boolean;
}

export interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type ProfileSettingsUpdate = Pick<
  Profile,
  "full_name" | "location" | "report_organization" | "is_dark_mode" | "show_detailed_results"
>;

export function buildProfileSettingsUpdate(
  form: ProfileSettingsForm,
  _currentProfile: Profile,
): ProfileSettingsUpdate {
  return {
    full_name: form.fullName.trim() || null,
    location: form.location.trim() || null,
    report_organization: form.reportOrganization,
    is_dark_mode: !form.isLightMode,
    show_detailed_results: form.isShowingDetailedResults,
  };
}

export function validatePasswordChange(form: PasswordChangeForm): string | null {
  if (!form.currentPassword.trim()) {
    return "Enter your current password";
  }

  if (!form.newPassword.trim()) {
    return "Enter a new password";
  }

  if (form.newPassword.trim().length < 6) {
    return "Password must be at least 6 characters";
  }

  if (form.newPassword !== form.confirmPassword) {
    return "New passwords do not match";
  }

  return null;
}
