import assert from "node:assert/strict";
import test from "node:test";
import { InspectionChart, SummaryCards } from "@/widgets/admin-dashboard";

test("admin dashboard publishes overview UI ownership", () => {
  assert.equal(typeof InspectionChart, "function");
  assert.equal(typeof SummaryCards, "function");
});
