import assert from "node:assert/strict";
import test from "node:test";

import ProfileTutorialPage from "../../../../src/pages/inspector/profile-tutorial-page";

test("profile tutorial route owns a page component", () => {
  assert.equal(typeof ProfileTutorialPage, "function");
});
