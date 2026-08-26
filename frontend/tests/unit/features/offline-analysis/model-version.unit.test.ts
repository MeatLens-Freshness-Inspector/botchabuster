import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ANALYSIS_MODEL_CATALOG,
  getAnalysisModelVersionKey,
} from "../../../../src/features/offline-analysis/lib/model-catalog";
import {
  getActiveAnalysisModelVersionKey,
  setActiveAnalysisModel,
} from "../../../../src/features/offline-analysis/lib/analysis-runtime";

test("every catalog model has a stable version key", () => {
  const keys = ANALYSIS_MODEL_CATALOG.map((entry) => entry.versionKey);
  assert.equal(new Set(keys).size, ANALYSIS_MODEL_CATALOG.length);
  assert.ok(keys.every((key) => key.length > 0));
});

test("active analysis model exposes the catalog deployment key", () => {
  for (const entry of ANALYSIS_MODEL_CATALOG) {
    setActiveAnalysisModel(entry.value);
    assert.equal(getAnalysisModelVersionKey(entry.value), entry.versionKey);
    assert.equal(getActiveAnalysisModelVersionKey(), entry.versionKey);
  }
});
