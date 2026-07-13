import type { FreshnessClassification } from "@/types/inspection";
import {
  classifyRecommendation,
  computeFreshnessScore,
  normalizeClassificationLabel,
  type FreshnessRecommendation,
  type MeatLensModelMetadata,
} from "./meatLensPipeline";

const ENSEMBLE_MOBILE_WEIGHT = 0.85;
const ENSEMBLE_RESNET_WEIGHT = 0.15;

export const ENSEMBLE_LABEL_ORDER: FreshnessClassification[] = [
  "fresh",
  "acceptable",
  "warning",
  "not fresh",
  "spoiled",
];

const MOBILE_SCORE_WEIGHTS: Partial<Record<FreshnessClassification, number>> = {
  fresh: 1,
  "not fresh": 0.5,
  spoiled: 0,
};

const RESNET_SCORE_WEIGHTS: Partial<Record<FreshnessClassification, number>> = {
  fresh: 1,
  acceptable: 0.67,
  warning: 0.33,
  spoiled: 0,
};

export interface EnsembleSourcePrediction {
  classification: FreshnessClassification;
  confidence: number;
  confidenceProbability: number;
  probabilities: Partial<Record<FreshnessClassification, number>>;
  freshnessScore: number;
  recommendation: FreshnessRecommendation;
  labelOrder: FreshnessClassification[];
  metadata: MeatLensModelMetadata;
  modelPath?: string | null;
}

export interface EnsembleFusionResult {
  classification: FreshnessClassification;
  confidenceProbability: number;
  confidencePercent: number;
  probabilities: Partial<Record<FreshnessClassification, number>>;
  labelOrder: FreshnessClassification[];
  freshnessScore: number;
  recommendation: FreshnessRecommendation;
  analysisSource: "ensemble";
  modelPath: string | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getProbability(
  probabilities: Partial<Record<FreshnessClassification, number>> | undefined,
  label: FreshnessClassification
): number {
  const value = probabilities?.[label];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function computeOrdinalScore(
  probabilities: Partial<Record<FreshnessClassification, number>> | undefined,
  weights: Partial<Record<FreshnessClassification, number>>
): number {
  return Object.entries(weights).reduce((sum, [label, weight]) => {
    const classification = normalizeClassificationLabel(label);
    return sum + getProbability(probabilities, classification) * (weight ?? 0);
  }, 0);
}

function mergeProbabilities(
  mobileNet: EnsembleSourcePrediction | null,
  resNet: EnsembleSourcePrediction | null
): Partial<Record<FreshnessClassification, number>> {
  const mobileWeight = mobileNet && resNet ? ENSEMBLE_MOBILE_WEIGHT : 1;
  const resNetWeight = mobileNet && resNet ? ENSEMBLE_RESNET_WEIGHT : 1;
  const merged: Partial<Record<FreshnessClassification, number>> = {};

  for (const label of ENSEMBLE_LABEL_ORDER) {
    const mobileValue = mobileNet ? getProbability(mobileNet.probabilities, label) : 0;
    const resNetValue = resNet ? getProbability(resNet.probabilities, label) : 0;
    const weightedValue = mobileValue * mobileWeight + resNetValue * resNetWeight;
    if (weightedValue > 0) {
      merged[label] = weightedValue;
    }
  }

  return merged;
}

function resolveLabelOrder(
  mobileNet: EnsembleSourcePrediction | null,
  resNet: EnsembleSourcePrediction | null
): FreshnessClassification[] {
  if (mobileNet && resNet) {
    return [...ENSEMBLE_LABEL_ORDER];
  }

  if (mobileNet) {
    return [...mobileNet.labelOrder];
  }

  if (resNet) {
    return [...resNet.labelOrder];
  }

  return [];
}

function buildModelPathLabel(
  mobileNet: EnsembleSourcePrediction | null,
  resNet: EnsembleSourcePrediction | null
): string | null {
  const paths = [
    mobileNet?.modelPath?.trim(),
    resNet?.modelPath?.trim(),
  ].filter((path): path is string => Boolean(path));

  if (paths.length === 0) {
    return null;
  }

  if (paths.length === 1) {
    return paths[0];
  }

  return paths.join(" + ");
}

function classifyEnsembleScore(score: number): FreshnessClassification {
  if (score >= 0.8) {
    return "fresh";
  }

  if (score >= 0.6) {
    return "acceptable";
  }

  if (score >= 0.4) {
    return "warning";
  }

  if (score >= 0.2) {
    return "not fresh";
  }

  return "spoiled";
}

export function buildEnsembleAnalysisResult(
  mobileNet: EnsembleSourcePrediction | null,
  resNet: EnsembleSourcePrediction | null
): EnsembleFusionResult | null {
  if (!mobileNet && !resNet) {
    return null;
  }

  if (mobileNet && !resNet) {
    return {
      classification: mobileNet.classification,
      confidenceProbability: mobileNet.confidenceProbability,
      confidencePercent: mobileNet.confidence,
      probabilities: { ...mobileNet.probabilities },
      labelOrder: [...mobileNet.labelOrder],
      freshnessScore: mobileNet.freshnessScore,
      recommendation: mobileNet.recommendation,
      analysisSource: "ensemble",
      modelPath: buildModelPathLabel(mobileNet, null),
    };
  }

  if (resNet && !mobileNet) {
    return {
      classification: resNet.classification,
      confidenceProbability: resNet.confidenceProbability,
      confidencePercent: resNet.confidence,
      probabilities: { ...resNet.probabilities },
      labelOrder: [...resNet.labelOrder],
      freshnessScore: resNet.freshnessScore,
      recommendation: resNet.recommendation,
      analysisSource: "ensemble",
      modelPath: buildModelPathLabel(null, resNet),
    };
  }

  const mobileScore = mobileNet ? computeOrdinalScore(mobileNet.probabilities, MOBILE_SCORE_WEIGHTS) : 0;
  const resNetScore = resNet ? computeOrdinalScore(resNet.probabilities, RESNET_SCORE_WEIGHTS) : 0;

  const ensembleScore = mobileNet && resNet
    ? clamp(
        mobileScore * ENSEMBLE_MOBILE_WEIGHT + resNetScore * ENSEMBLE_RESNET_WEIGHT,
        0,
        1
      )
    : clamp(mobileNet ? mobileScore : resNetScore, 0, 1);

  const classification = classifyEnsembleScore(ensembleScore);
  const confidenceProbability = ensembleScore;
  const confidencePercent = Math.round(confidenceProbability * 100);
  const freshnessScore = computeFreshnessScore(classification, confidenceProbability);

  return {
    classification,
    confidenceProbability,
    confidencePercent,
    probabilities: mergeProbabilities(mobileNet, resNet),
    labelOrder: resolveLabelOrder(mobileNet, resNet),
    freshnessScore,
    recommendation: classifyRecommendation(freshnessScore),
    analysisSource: "ensemble",
    modelPath: buildModelPathLabel(mobileNet, resNet),
  };
}
