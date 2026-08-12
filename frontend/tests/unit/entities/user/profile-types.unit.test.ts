import assert from "node:assert/strict";
import test from "node:test";

import { createProfileDialogState } from "../../../../src/entities/user/model/profile-types";

test("profile entity starts dialogs closed", () => {
  assert.deepEqual(createProfileDialogState(), {
    showPasswordDialog: false,
    showPrivacyDialog: false,
    showSignOutConfirm: false,
    showTermsDialog: false,
  });
});
