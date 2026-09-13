import assert from "node:assert/strict";
import test from "node:test";
import { InspectionChart, SummaryCards } from "@/widgets/admin-dashboard";
import { DisputeOverview } from "../../../../src/widgets/admin-dashboard/ui/overview/dispute-overview";

test("admin dashboard publishes overview UI ownership", () => {
  assert.equal(typeof InspectionChart, "function");
  assert.equal(typeof SummaryCards, "function");
  assert.equal(typeof DisputeOverview, "function");
});
