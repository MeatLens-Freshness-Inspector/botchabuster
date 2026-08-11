import assert from "node:assert/strict";
import test from "node:test";
import { ConfirmDialog, MetricCard, PageHeader } from "@/shared/ui";
import { PrivacyPolicyDialog, TermsAndConditionsDialog } from "@/widgets/legal";
import { InspectionDetailSheet } from "@/widgets/inspection-history";

test("migrated component ownership publishes maintained public APIs", () => {
  assert.equal(typeof ConfirmDialog, "function");
  assert.equal(typeof MetricCard, "function");
  assert.equal(typeof PageHeader, "function");
  assert.equal(typeof PrivacyPolicyDialog, "function");
  assert.equal(typeof TermsAndConditionsDialog, "function");
  assert.equal(typeof InspectionDetailSheet, "function");
});
