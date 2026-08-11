import assert from "node:assert/strict";
import test from "node:test";

import {
  useDashboardSession,
  useOverviewTab,
} from "../../../../src/widgets/admin-dashboard";

test("admin dashboard publishes session and overview state hooks", () => {
  assert.equal(typeof useDashboardSession, "function");
  assert.equal(typeof useOverviewTab, "function");
});
