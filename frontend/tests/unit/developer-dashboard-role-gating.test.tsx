import assert from "node:assert/strict";
import test from "node:test";
import {
  coerceAdminDashboardTab,
  getAdminDashboardTabs,
} from "../../src/pages/admin-dashboard/utils/adminDashboard";

test("plain admins do not get the developer workspace tab", () => {
  const tabs = getAdminDashboardTabs(false);
  assert.equal(tabs.some((tab) => tab.key === "developer"), false);
});

test("developers get the developer workspace tab with the new label", () => {
  const tabs = getAdminDashboardTabs(true);
  const developerTab = tabs.find((tab) => tab.key === "developer");
  assert.equal(developerTab?.label, "Developer Settings");
});

test("stale developer tab selection falls back to overview for non-developers", () => {
  assert.equal(coerceAdminDashboardTab("developer", false), "overview");
});
