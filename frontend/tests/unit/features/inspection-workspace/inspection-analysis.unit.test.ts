import assert from "node:assert/strict";
import test from "node:test";

import { deriveInspectionAnalysisState } from "../../../../src/widgets/inspection-workspace/model/use-inspection-analysis";

test("inspection analysis state exposes blocked readiness without changing status text", () => {
  const state = deriveInspectionAnalysisState({
    isModelReady: false,
    isAnalyzing: false,
    result: null,
    inspectionDecisionSource: null,
    online: true,
  });

  assert.equal(state.isAnalyzeBlockedByModel, true);
  assert.equal(state.analysisStatusText, "Pending");
});

test("inspection analysis state preserves protocol result labels", () => {
  const state = deriveInspectionAnalysisState({
    isModelReady: true,
    isAnalyzing: false,
    result: { classification: "spoiled" } as never,
    inspectionDecisionSource: "protocol_pre_scan",
    online: true,
  });

  assert.equal(state.isAnalyzeBlockedByModel, false);
  assert.equal(state.analysisStatusText, "Protocol Result");
});
