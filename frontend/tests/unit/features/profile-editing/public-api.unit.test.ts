import assert from "node:assert/strict";
import test from "node:test";

import * as profileEditing from "../../../../src/features/profile-editing";

test("profile editing publishes its editor workflow", () => {
  assert.equal(typeof profileEditing.useProfileEditor, "function");
});
