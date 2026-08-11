import assert from "node:assert/strict";
import test from "node:test";
import { useAdminDashboard } from "@/widgets/admin-dashboard";
import { useDeveloperDashboard } from "@/features/developer-tools";

test("dashboard composition exposes page and developer model hooks", () => {
  assert.equal(typeof useAdminDashboard, "function");
  assert.equal(typeof useDeveloperDashboard, "function");
});
