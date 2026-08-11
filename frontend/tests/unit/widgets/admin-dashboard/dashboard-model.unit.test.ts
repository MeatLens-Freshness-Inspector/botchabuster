import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_DASHBOARD_TABS,
  type AdminDashboardTabKey,
} from "../../../../src/widgets/admin-dashboard";

test("admin dashboard model publishes its tab contract", () => {
  const firstTab = ADMIN_DASHBOARD_TABS[0] as { key: AdminDashboardTabKey };
  assert.equal(firstTab.key, "overview");
});
