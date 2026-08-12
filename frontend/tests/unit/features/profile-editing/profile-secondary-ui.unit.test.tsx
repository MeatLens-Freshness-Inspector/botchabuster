import assert from "node:assert/strict";
import test from "node:test";

import { ProfileSecondaryColumn } from "../../../../src/widgets/profile/profile-secondary-column";
import { ProfileSummaryCard } from "../../../../src/entities/user/ui/profile-summary-card";

test("profile secondary ownership exposes widget and entity summary UI", () => {
  assert.equal(typeof ProfileSecondaryColumn, "function");
  assert.equal(typeof ProfileSummaryCard, "function");
});
