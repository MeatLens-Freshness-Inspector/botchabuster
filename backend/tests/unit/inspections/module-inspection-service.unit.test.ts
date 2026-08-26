import assert from "node:assert/strict";
import "../../setup/env";
import { test } from "node:test";
import { InspectionService } from "../../../src/modules/inspections/infrastructure/InspectionService";
import type { InspectionInsert } from "../../../src/types/inspection";

test("inspections module owns inspection persistence", () => {
  assert.equal(typeof InspectionService.getInstance, "function");
});

test("inspection inserts accept a stable model version key", () => {
  const input: InspectionInsert = {
    user_id: "user-1",
    client_submission_id: "submission-1",
    meat_type: "pork",
    classification: "fresh",
    confidence_score: 0.91,
    model_version_key: "mobilenet-primary-2026-08-13",
  };

  assert.equal(input.model_version_key, "mobilenet-primary-2026-08-13");
});
