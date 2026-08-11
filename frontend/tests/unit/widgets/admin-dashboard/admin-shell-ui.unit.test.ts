import assert from "node:assert/strict";
import test from "node:test";
import { DesktopAdminDashboard, MobileAdminDashboard } from "@/widgets/admin-dashboard";

test("admin dashboard publishes responsive shell ownership", () => {
  assert.equal(typeof DesktopAdminDashboard, "function");
  assert.equal(typeof MobileAdminDashboard, "function");
});
