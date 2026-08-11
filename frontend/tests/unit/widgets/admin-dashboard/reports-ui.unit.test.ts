import assert from "node:assert/strict";
import test from "node:test";
import { MobileReportsTab, ReportsTab } from "@/widgets/admin-dashboard";

test("admin dashboard publishes report widget ownership", () => {
  assert.equal(typeof ReportsTab, "function");
  assert.equal(typeof MobileReportsTab, "function");
});
