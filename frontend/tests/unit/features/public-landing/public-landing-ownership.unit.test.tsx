import assert from "node:assert/strict";
import test from "node:test";

import LandingPage from "../../../../src/pages/public/landing-page";
import { TermsAndConditionsContent } from "../../../../src/widgets/legal/terms-content";

test("public landing ownership publishes its page and legal widget", () => {
  assert.equal(typeof LandingPage, "function");
  assert.equal(typeof TermsAndConditionsContent, "function");
});
