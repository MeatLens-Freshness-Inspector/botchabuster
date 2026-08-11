import assert from "node:assert/strict";
import test from "node:test";
import { OverviewTab } from "@/widgets/admin-dashboard";

test("admin dashboard publishes the complete overview widget", () => {
  assert.equal(typeof OverviewTab, "function");
});
