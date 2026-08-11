import assert from "node:assert/strict";
import test from "node:test";

import * as offlineAnalysis from "../../../../src/features/offline-analysis";

test("offline-analysis publishes model lifecycle and analysis contracts", () => {
  assert.equal(typeof offlineAnalysis.analyzeOffline, "function");
  assert.equal(typeof offlineAnalysis.prewarmModel, "function");
  assert.equal(typeof offlineAnalysis.isModelReady, "function");
  assert.equal(typeof offlineAnalysis.createModelInputImageFile, "function");
  assert.equal(typeof offlineAnalysis.resolveSquareCropRegion, "function");
  assert.equal(typeof offlineAnalysis.computeFreshnessScore, "function");
});
