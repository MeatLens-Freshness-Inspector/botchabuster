import assert from "node:assert/strict";
import test from "node:test";

import HistoryPage from "../../../../src/pages/inspector/history-page";

test("history route owns a page component", () => {
  assert.equal(typeof HistoryPage, "function");
});
