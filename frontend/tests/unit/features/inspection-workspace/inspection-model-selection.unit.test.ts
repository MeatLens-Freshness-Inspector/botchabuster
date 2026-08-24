import assert from "node:assert/strict";
import test from "node:test";

import { resolveInspectionModelSelection } from "../../../../src/widgets/inspection-workspace/model/analysis-model-selection";

test("inspection workspace uses primary for regular and locked users", () => {
  assert.equal(resolveInspectionModelSelection(null, false, false, "resnet50"), "primary");
  assert.equal(resolveInspectionModelSelection({ id: "admin-1" }, true, false, "ensemble"), "primary");
});

test("inspection workspace uses the selected model for unlocked admins", () => {
  for (const selectedModel of ["primary", "seed123_model2", "default", "resnet50", "ensemble"] as const) {
    assert.equal(
      resolveInspectionModelSelection({ id: "admin-1" }, true, true, selectedModel),
      selectedModel,
    );
  }
});
