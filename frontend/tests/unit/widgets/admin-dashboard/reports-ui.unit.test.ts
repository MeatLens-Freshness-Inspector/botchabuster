import assert from "node:assert/strict";
import test from "node:test";
import { MobileReportsTab, ReportsTab } from "@/widgets/admin-dashboard";
import { ReportsDisputesSection } from "../../../../src/widgets/admin-dashboard/ui/reports-disputes-section";

test("admin dashboard publishes report widget ownership", () => {
  assert.equal(typeof ReportsTab, "function");
  assert.equal(typeof MobileReportsTab, "function");
  assert.equal(typeof ReportsDisputesSection, "function");
});
