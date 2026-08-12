import assert from "node:assert/strict";
import test from "node:test";

import type { Profile } from "../../../../src/entities/user/api/profile-client";
import {
  buildProfileSettingsUpdate,
  validatePasswordChange,
  type PasswordChangeForm,
  type ProfileSettingsForm,
} from "../../../../src/features/profile-editing/model/profile-settings";

const profileFixture = {
  id: "user-1",
  full_name: "Inspector",
  avatar_url: null,
  inspector_code: "ACCESS-123",
  report_organization: "gordon_college_ccs",
  is_dark_mode: true,
  show_detailed_results: false,
  onboarding_completed_at: null,
  onboarding_version: 1,
  email: "inspector@example.com",
  location: "Market B",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
} satisfies Profile;

const profileForm: ProfileSettingsForm = {
  fullName: "Inspector Rivera",
  email: "rivera@example.com",
  location: "Market A",
  reportOrganization: "dti",
  isLightMode: true,
  isShowingDetailedResults: true,
};

test("buildProfileSettingsUpdate includes editable settings but never access code", () => {
  const update = buildProfileSettingsUpdate(profileForm, profileFixture);

  assert.deepEqual(update, {
    full_name: "Inspector Rivera",
    location: "Market A",
    report_organization: "dti",
    is_dark_mode: false,
    show_detailed_results: true,
  });
  assert.equal("inspector_code" in update, false);
});

test("buildProfileSettingsUpdate converts blank optional text to null", () => {
  const update = buildProfileSettingsUpdate({
    ...profileForm,
    fullName: "  ",
    location: "  ",
    reportOrganization: null,
  }, profileFixture);

  assert.deepEqual(update, {
    full_name: null,
    location: null,
    report_organization: null,
    is_dark_mode: false,
    show_detailed_results: true,
  });
});

test("validatePasswordChange rejects missing current password", () => {
  const form: PasswordChangeForm = {
    currentPassword: "",
    newPassword: "secret",
    confirmPassword: "secret",
  };

  assert.equal(validatePasswordChange(form), "Enter your current password");
});

test("validatePasswordChange rejects a short new password", () => {
  const form: PasswordChangeForm = {
    currentPassword: "old-password",
    newPassword: "short",
    confirmPassword: "short",
  };

  assert.equal(validatePasswordChange(form), "Password must be at least 6 characters");
});

test("validatePasswordChange rejects mismatched confirmation", () => {
  const form: PasswordChangeForm = {
    currentPassword: "old-password",
    newPassword: "secret-1",
    confirmPassword: "secret-2",
  };

  assert.equal(validatePasswordChange(form), "New passwords do not match");
});

test("validatePasswordChange accepts a complete password change", () => {
  const form: PasswordChangeForm = {
    currentPassword: "old-password",
    newPassword: "secret-1",
    confirmPassword: "secret-1",
  };

  assert.equal(validatePasswordChange(form), null);
});
