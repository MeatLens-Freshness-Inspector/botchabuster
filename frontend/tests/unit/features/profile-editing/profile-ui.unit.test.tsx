import assert from "node:assert/strict";
import test from "node:test";

import { ProfilePrimaryColumn } from "../../../../src/widgets/profile/profile-primary-column";
import { ProfileEditableDetailsCard } from "../../../../src/features/profile-editing/ui/editable-details-card";
import { PasswordChangeDialog } from "../../../../src/features/profile-editing/ui/password-change-dialog";
import { PreferencesAccountCard } from "../../../../src/features/profile-editing/ui/preferences-account-card";

test("profile UI ownership exposes the primary widget and editing card", () => {
  assert.equal(typeof ProfilePrimaryColumn, "function");
  assert.equal(typeof ProfileEditableDetailsCard, "function");
  assert.equal(typeof PasswordChangeDialog, "function");
  assert.equal(typeof PreferencesAccountCard, "function");
});
