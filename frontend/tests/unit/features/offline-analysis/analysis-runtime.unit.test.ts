import assert from "node:assert/strict";
import test from "node:test";

import {
  getActiveAnalysisMode,
  getActiveAnalysisModel,
  setActiveAnalysisModel,
} from "../../../../src/features/offline-analysis/lib/analysis-runtime";

test("analysis runtime starts with the primary MobileNetV3 selection", () => {
  setActiveAnalysisModel("primary");

  assert.equal(getActiveAnalysisModel(), "primary");
  assert.equal(getActiveAnalysisMode(), "mobilenetv3");
});

test("analysis runtime maps MobileNetV3 variants to MobileNet mode", () => {
  for (const selection of ["seed123_model2", "default"] as const) {
    setActiveAnalysisModel(selection);
    assert.equal(getActiveAnalysisModel(), selection);
    assert.equal(getActiveAnalysisMode(), "mobilenetv3");
  }
});

test("analysis runtime maps ResNet50 and ensemble selections to their modes", () => {
  setActiveAnalysisModel("resnet50");
  assert.equal(getActiveAnalysisModel(), "resnet50");
  assert.equal(getActiveAnalysisMode(), "resnet50");

  setActiveAnalysisModel("ensemble");
  assert.equal(getActiveAnalysisModel(), "ensemble");
  assert.equal(getActiveAnalysisMode(), "ensemble");
});
