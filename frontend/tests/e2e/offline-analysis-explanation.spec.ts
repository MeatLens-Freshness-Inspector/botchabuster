import { test, expect } from "@playwright/test";
import { buildModelAlignedExplanation } from "../../src/lib/offlineAnalysis/modelExplanation";

test.describe("offline analysis explanation alignment", () => {
  test("keeps spoiled narrative when model predicts spoiled and rules disagree", () => {
    const explanation = buildModelAlignedExplanation({
      modelClassification: "spoiled",
      meatType: "pork",
      ruleClassification: "fresh",
      ruleConfidenceScore: 92,
      deviationCount: 3,
    });

    expect(explanation.toLowerCase()).toContain("spoiled");
    expect(explanation.toLowerCase()).toContain("disagreement detected");
    expect(explanation.toLowerCase()).toContain("suggested fresh");
    expect(explanation.toLowerCase()).toContain("final classification follows the model output");
  });

  test("omits disagreement note when model and rules agree", () => {
    const explanation = buildModelAlignedExplanation({
      modelClassification: "fresh",
      meatType: "beef",
      ruleClassification: "fresh",
      ruleConfidenceScore: 88,
      deviationCount: 0,
    });

    expect(explanation.toLowerCase()).toContain("fresh");
    expect(explanation.toLowerCase()).toContain("supports this outcome");
    expect(explanation.toLowerCase()).toContain("model output is the primary basis");
    expect(explanation.toLowerCase()).not.toContain("disagreement detected");
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

    expect(explanation.toLowerCase()).toContain("disagreement detected");
    expect(explanation.toLowerCase()).toContain("adjusted to warning");
    expect(explanation.toLowerCase()).not.toContain("follows the model output as the primary basis");
  });
});
