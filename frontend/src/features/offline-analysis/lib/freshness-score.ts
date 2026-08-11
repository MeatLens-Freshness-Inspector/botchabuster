import type { FreshnessClassification } from "@/entities/inspection";
import { normalizeClassificationLabel } from "./classification";

export type FreshnessRecommendation = "Good for Consumption" | "Consume Immediately" | "Not Suitable";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mapToScoringClass(
  classification: FreshnessClassification
): "fresh" | "acceptable" | "not fresh" | "warning" | "spoiled" {
  return classification === "fresh" || classification === "acceptable" || classification === "warning" || classification === "spoiled"
    ? classification
    : "not fresh";
}

export function computeFreshnessScore(predictedClass: string, confidence: number): number {
  const boundedConfidence = clamp(confidence, 0, 1);
  const normalizedClass = mapToScoringClass(normalizeClassificationLabel(predictedClass));
  let score: number;
  if (normalizedClass === "fresh") score = 70 + 30 * boundedConfidence;
  else if (normalizedClass === "acceptable") score = 60 + 20 * boundedConfidence;
  else if (normalizedClass === "not fresh") score = 40 + 20 * boundedConfidence;
  else if (normalizedClass === "warning") score = 20 + 20 * boundedConfidence;
  else score = 20 - 20 * boundedConfidence;
  return clamp(score, 0, 100);
}

export function classifyRecommendation(score: number): FreshnessRecommendation {
  if (score >= 70) return "Good for Consumption";
  if (score >= 40) return "Consume Immediately";
  return "Not Suitable";
}
