import { test, expect } from "@playwright/test";

import type { FreshnessClassification } from "../src/types/inspection";
import { buildEnsembleAnalysisResult } from "../src/lib/offlineAnalysis/ensemble";

function buildModelResult(
  classification: FreshnessClassification,
  confidence: number,
  modelPath: string,
  probabilities: Partial<Record<FreshnessClassification, number>>,
) {
  return {
    classification,
    confidence,
    confidenceProbability: confidence / 100,
    probabilities,
    freshnessScore: confidence,
    recommendation: "Good for Consumption" as const,
    labelOrder: ["fresh", "not fresh", "spoiled"] as FreshnessClassification[],
    modelPath,
    metadata: {
      backbone: "MobileNetV3Small",
      preprocess_function_name: "identity",
      input_size: 224,
      image_crop_mode: "center_crop",
      label_order: ["fresh", "not fresh", "spoiled"],
    },
  };
}

test("fuses MobileNetV3 and ResNet50 probabilities using the documented ordinal score", () => {
  const mobileNet = buildModelResult("fresh", 91, "MobileNetV3-small seed123/model2", {
    fresh: 0.8,
    "not fresh": 0.15,
    spoiled: 0.05,
  });
  const resNet = buildModelResult("fresh", 87, "ResNet50", {
    fresh: 0.7,
    acceptable: 0.2,
    warning: 0.05,
    spoiled: 0.05,
  });

  const result = buildEnsembleAnalysisResult(mobileNet, resNet);

  expect(result).not.toBeNull();
  expect(result?.classification).toBe("fresh");
  expect(result?.confidenceProbability).toBeCloseTo(0.863975, 6);
  expect(result?.confidencePercent).toBe(86);
  expect(result?.freshnessScore).toBeGreaterThan(90);
  expect(result?.recommendation).toBe("Good for Consumption");
  expect(result?.analysisSource).toBe("ensemble");
  expect(result?.modelPath).toContain("MobileNetV3");
  expect(result?.modelPath).toContain("ResNet50");
});

test("falls back to the available model when the other ensemble branch is unavailable", () => {
  const mobileNet = buildModelResult("not fresh", 66, "MobileNetV3-small seed123/model2", {
    fresh: 0.06,
    "not fresh": 0.49,
    spoiled: 0.45,
  });

  const result = buildEnsembleAnalysisResult(mobileNet, null);

  expect(result).not.toBeNull();
  expect(result?.classification).toBe("not fresh");
  expect(result?.confidencePercent).toBe(66);
  expect(result?.analysisSource).toBe("ensemble");
});
