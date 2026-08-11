import assert from "node:assert/strict";
import test from "node:test";

import { buildModelAlignedExplanation } from "../../../src/features/offline-analysis/lib/model-explanation";

test("keeps spoiled narrative when model predicts spoiled and rules disagree", () => {
  const explanation = buildModelAlignedExplanation({
    modelClassification: "spoiled",
    meatType: "pork",
    ruleClassification: "fresh",
    ruleConfidenceScore: 92,
    deviationCount: 3,
  });

  assert.match(explanation.toLowerCase(), /spoiled/);
  assert.match(explanation.toLowerCase(), /disagreement detected/);
  assert.match(explanation.toLowerCase(), /suggested fresh/);
  assert.match(explanation.toLowerCase(), /final classification follows the model output/);
});

test("omits disagreement note when model and rules agree", () => {
  const explanation = buildModelAlignedExplanation({
    modelClassification: "fresh",
    meatType: "beef",
    ruleClassification: "fresh",
    ruleConfidenceScore: 88,
    deviationCount: 0,
  });

  assert.match(explanation.toLowerCase(), /fresh/);
  assert.match(explanation.toLowerCase(), /supports this outcome/);
  assert.match(explanation.toLowerCase(), /model output is the primary basis/);
  assert.doesNotMatch(explanation.toLowerCase(), /disagreement detected/);
});

test("documents rule override when low-confidence model disagrees", () => {
  const explanation = buildModelAlignedExplanation({
    modelClassification: "spoiled",
    finalClassification: "warning",
    usedRuleOverride: true,
    meatType: "pork",
    ruleClassification: "warning",
    ruleConfidenceScore: 67,
    deviationCount: 2,
  });

  assert.match(explanation.toLowerCase(), /disagreement detected/);
  assert.match(explanation.toLowerCase(), /adjusted to warning/);
  assert.doesNotMatch(explanation.toLowerCase(), /follows the model output as the primary basis/);
});
