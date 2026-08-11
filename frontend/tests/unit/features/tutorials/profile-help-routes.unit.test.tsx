import assert from "node:assert/strict";
import test from "node:test";

import ProfileHelpPage from "../../../../src/pages/inspector/profile-help-page";
import ProfileHelpScopePage from "../../../../src/pages/inspector/profile-help-scope-page";

test("profile help routes publish page components", () => {
  assert.equal(typeof ProfileHelpPage, "function");
  assert.equal(typeof ProfileHelpScopePage, "function");
});
