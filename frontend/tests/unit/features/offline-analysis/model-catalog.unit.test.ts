import assert from "node:assert/strict";
import test from "node:test";

import {
  ANALYSIS_MODEL_CATALOG,
  formatModelAddedDate,
  isAnalysisModelSelection,
} from "../../../../src/features/offline-analysis/lib/model-catalog";

test("catalog lists all selectable models with neutral labels and added dates", () => {
  assert.deepEqual(ANALYSIS_MODEL_CATALOG.map((entry) => entry.value), [
    "primary",
    "seed123_model2",
    "default",
    "resnet50",
    "ensemble",
  ]);
  assert.equal(ANALYSIS_MODEL_CATALOG[0].label, "Primary MobileNetV3");
  assert.equal(ANALYSIS_MODEL_CATALOG[0].addedOn, "2026-08-13");
  assert.ok(ANALYSIS_MODEL_CATALOG.every((entry) => entry.label.length > 0));
});

test("date formatter renders project-added dates without timezone drift", () => {
  assert.equal(formatModelAddedDate("2026-08-13"), "Aug 13, 2026");
  assert.equal(formatModelAddedDate(null), "Date unavailable");
});

test("selection guard accepts only catalog values", () => {
  assert.equal(isAnalysisModelSelection("primary"), true);
  assert.equal(isAnalysisModelSelection("resnet50"), true);
  assert.equal(isAnalysisModelSelection("unknown"), false);
  assert.equal(isAnalysisModelSelection(null), false);
});
