import assert from "node:assert/strict";
import type { AnalysisResult, FreshnessClassification } from "../../../frontend/src/types/inspection";

const analysisLabels = new Set<FreshnessClassification>(["fresh", "not fresh", "spoiled", "acceptable", "warning"]);
const predictionLabels = ["fresh", "not_fresh", "spoiled"] as const;

export type FreshnessPredictionContract = {
  label: (typeof predictionLabels)[number];
  confidence: number;
  probabilities: Record<(typeof predictionLabels)[number], number>;
  modelVersion: string;
  inferenceTimeMs: number;
};

function assertRecord(value: unknown, message: string): asserts value is Record<string, unknown> {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), message);
}

function assertFiniteNumber(value: unknown, message: string): asserts value is number {
  assert.equal(typeof value, "number", message);
  assert.ok(Number.isFinite(value), message);
}

export function assertAnalysisResponseSchema(value: unknown): asserts value is AnalysisResult {
  assertRecord(value, "Analysis response must be an object");
  assert.ok(analysisLabels.has(value.classification as FreshnessClassification), "classification must be a supported freshness label");
  assertFiniteNumber(value.confidence_score, "confidence_score must be a finite number");
  assert.ok(value.confidence_score >= 0 && value.confidence_score <= 1, "confidence_score must be within 0..1");
  assert.ok(Array.isArray(value.flagged_deviations), "flagged_deviations must be an array");
  assert.ok(value.flagged_deviations.every((item) => typeof item === "string"), "flagged_deviations must contain only strings");
  assert.equal(typeof value.explanation, "string", "explanation must be a string");

  if (value.probabilities !== undefined) {
    assertRecord(value.probabilities, "probabilities must be an object when present");

    for (const [label, probability] of Object.entries(value.probabilities)) {
      assert.ok(analysisLabels.has(label as FreshnessClassification), `Unexpected probability label: ${label}`);
      assertFiniteNumber(probability, `Probability for ${label} must be finite`);
      assert.ok(probability >= 0 && probability <= 1, `Probability for ${label} must be within 0..1`);
    }
  }

  if (value.label_order !== undefined) {
    assert.ok(Array.isArray(value.label_order), "label_order must be an array when present");
    assert.ok(value.label_order.every((label) => analysisLabels.has(label)), "label_order must only contain supported freshness labels");
  }
}

export function assertFreshnessPredictionContract(value: unknown): asserts value is FreshnessPredictionContract {
  assertRecord(value, "Prediction payload must be an object");
  assert.ok(predictionLabels.includes(value.label as FreshnessPredictionContract["label"]), "Prediction label must be one of fresh, not_fresh, or spoiled");
  assertFiniteNumber(value.confidence, "Prediction confidence must be finite");
  assert.ok(value.confidence >= 0 && value.confidence <= 1, "Prediction confidence must be within 0..1");
  assert.equal(typeof value.modelVersion, "string", "modelVersion must be a string");
  assert.ok(value.modelVersion.trim().length > 0, "modelVersion must not be empty");
  assertFiniteNumber(value.inferenceTimeMs, "inferenceTimeMs must be finite");
  assert.ok(value.inferenceTimeMs >= 0, "inferenceTimeMs must be zero or greater");

  assertRecord(value.probabilities, "Prediction probabilities must be an object");
  assert.deepEqual(
    Object.keys(value.probabilities).sort(),
    [...predictionLabels].sort(),
    "Prediction probabilities must contain exactly fresh, not_fresh, and spoiled",
  );

  const total = predictionLabels.reduce((sum, label) => {
    const probability = value.probabilities[label];
    assertFiniteNumber(probability, `Probability for ${label} must be finite`);
    assert.ok(probability >= 0 && probability <= 1, `Probability for ${label} must be within 0..1`);
    return sum + probability;
  }, 0);

  assert.ok(Math.abs(total - 1) < 0.001, `Prediction probabilities must sum to 1.0, received ${total}`);

  const highestLabel = predictionLabels.reduce((current, candidate) =>
    value.probabilities[candidate] > value.probabilities[current] ? candidate : current,
  );
  assert.equal(value.label, highestLabel, "Prediction label must match the highest probability");
}
