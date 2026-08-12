import assert from "node:assert/strict";
import test from "node:test";

import { ProfilePrimaryColumn } from "../../../../src/widgets/profile/profile-primary-column";
import { ProfileEditableDetailsCard } from "../../../../src/features/profile-editing/ui/editable-details-card";
import { PasswordChangeCard } from "../../../../src/features/profile-editing/ui/password-change-card";
import { AccountActionsCard } from "../../../../src/features/profile-editing/ui/account-actions-card";

test("profile UI ownership exposes the primary widget and editing card", () => {
  assert.equal(typeof ProfilePrimaryColumn, "function");
  assert.equal(typeof ProfileEditableDetailsCard, "function");
  assert.equal(typeof PasswordChangeCard, "function");
  assert.equal(typeof AccountActionsCard, "function");
});
