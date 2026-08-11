import type { FreshnessClassification } from "@/entities/inspection";

const DEFAULT_LABEL_ORDER_4 = ["fresh", "acceptable", "warning", "spoiled"] as const;
const DEFAULT_LABEL_ORDER_3 = ["fresh", "not fresh", "spoiled"] as const;
const DEFAULT_LABEL_ORDER_2 = ["fresh", "spoiled"] as const;
const LOW_CONFIDENCE_WARNING_THRESHOLD_PERCENT = 90;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeClassificationLabel(label: string): FreshnessClassification {
  const normalized = label.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (normalized === "not fresh" || normalized === "notfresh") return "not fresh";
  if (normalized === "fresh") return "fresh";
  if (normalized === "spoiled") return "spoiled";
  if (normalized === "acceptable") return "acceptable";
  if (normalized === "warning") return "warning";
  return "not fresh";
}

export function resolveOutputLabels(
  classCount: number,
  metadataLabelOrder?: string[] | null
): FreshnessClassification[] {
  const normalizedMetadataOrder = (metadataLabelOrder ?? [])
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
    .map(normalizeClassificationLabel);
  if (normalizedMetadataOrder.length === classCount && classCount > 0) return normalizedMetadataOrder;
  if (classCount === 4) return [...DEFAULT_LABEL_ORDER_4];
  if (classCount === 3) return [...DEFAULT_LABEL_ORDER_3];
  if (classCount === 2) return [...DEFAULT_LABEL_ORDER_2];
  return [...DEFAULT_LABEL_ORDER_3].slice(0, Math.max(1, Math.min(classCount, DEFAULT_LABEL_ORDER_3.length)));
}

function softmax(values: number[]): number[] {
  const maxValue = Math.max(...values);
  const exponentials = values.map((value) => Math.exp(value - maxValue));
  const denominator = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / denominator);
}

export function normalizeModelProbabilities(values: number[]): number[] {
  if (values.length === 0) return [];
  const allInUnitRange = values.every((value) => value >= 0 && value <= 1);
  const sum = values.reduce((accumulator, value) => accumulator + value, 0);
  return allInUnitRange && sum > 0.99 && sum < 1.01 ? values : softmax(values);
}

export function parsePrediction(probabilities: number[], labelOrder: string[]): {
  predictedClass: FreshnessClassification;
  confidence: number;
  confidencePercent: number;
  probabilitiesByLabel: Record<string, number>;
} {
  const canMergeLowConfidencePair = (first: FreshnessClassification, second: FreshnessClassification): boolean =>
    (first === "fresh" && second === "not fresh") ||
    (first === "not fresh" && second === "fresh") ||
    (first === "not fresh" && second === "spoiled") ||
    (first === "spoiled" && second === "not fresh");
  const usableLength = Math.min(probabilities.length, labelOrder.length);
  if (usableLength === 0) {
    return { predictedClass: "not fresh", confidence: 0, confidencePercent: 0, probabilitiesByLabel: {} };
  }

  const ranked = Array.from({ length: usableLength }, (_, index) => ({ index, value: probabilities[index] }))
    .sort((left, right) => right.value - left.value);
  const topPrediction = ranked[0];
  const topClass = normalizeClassificationLabel(labelOrder[topPrediction.index]);
  const topConfidence = clamp(topPrediction.value, 0, 1);
  const topConfidencePercent = Math.round(clamp(topConfidence * 100, 0, 100));
  const secondClass = ranked.length > 1 ? normalizeClassificationLabel(labelOrder[ranked[1].index]) : null;
  const secondConfidence = ranked.length > 1 ? clamp(ranked[1].value, 0, 1) : 0;
  const probabilitiesByLabel: Record<string, number> = {};
  for (let index = 0; index < usableLength; index++) {
    probabilitiesByLabel[normalizeClassificationLabel(labelOrder[index])] = probabilities[index];
  }

  let effectiveConfidence = topConfidence;
  if (topConfidencePercent < LOW_CONFIDENCE_WARNING_THRESHOLD_PERCENT && secondClass && canMergeLowConfidencePair(topClass, secondClass)) {
    effectiveConfidence = clamp(topConfidence + secondConfidence, 0, 1);
  }
  const effectiveConfidencePercent = Math.round(clamp(effectiveConfidence * 100, 0, 100));
  return {
    predictedClass: effectiveConfidencePercent < LOW_CONFIDENCE_WARNING_THRESHOLD_PERCENT ? "warning" : topClass,
    confidence: effectiveConfidence,
    confidencePercent: effectiveConfidencePercent,
    probabilitiesByLabel,
  };
}
