import assert from "node:assert/strict";
import test from "node:test";
import AdminDashboardPage from "@/pages/admin/admin-dashboard-page";
import DesktopAdminDashboardPage from "@/pages/admin/desktop-admin-dashboard-page";
import AdminDashboardWrapper from "@/pages/admin/admin-dashboard-wrapper";

test("admin routes publish thin page entrypoints", () => {
  assert.equal(typeof AdminDashboardPage, "function");
  assert.equal(typeof DesktopAdminDashboardPage, "function");
  assert.equal(typeof AdminDashboardWrapper, "function");
});
