import assert from "node:assert/strict";
import test from "node:test";

import ProfilePage from "../../../../src/pages/inspector/profile-page";

test("profile route owns a page component", () => {
  assert.equal(typeof ProfilePage, "function");
});
