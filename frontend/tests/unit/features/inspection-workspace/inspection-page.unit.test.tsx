import assert from "node:assert/strict";
import test from "node:test";

import InspectPage from "../../../../src/pages/inspector/inspect-page";

test("inspect route owns a page component", () => {
  assert.equal(typeof InspectPage, "function");
});
