type RuleFreshnessClass = "fresh" | "acceptable" | "warning" | "spoiled";

const MODEL_CLASS_EXPLANATIONS: Record<string, (meatType: string) => string> = {
  fresh: (meatType) =>
    `${meatType} sample aligns with fresh visual patterns, with color and texture cues typical of recent handling.`,
  acceptable: (meatType) =>
    `${meatType} sample appears acceptable, but early freshness decline markers are present and should be monitored.`,
  warning: (meatType) =>
    `${meatType} sample shows warning-level freshness signals with notable quality drift.`,
  "not fresh": (meatType) =>
    `${meatType} sample appears not fresh and should be consumed immediately if still safe.`,
  spoiled: (meatType) =>
    `${meatType} sample shows spoiled-level characteristics with strong visual spoilage indicators.`,
};

function formatClassLabel(value: string): string {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildModelAlignedExplanation({
  modelClassification,
  meatType,
  ruleClassification,
  ruleConfidenceScore,
  deviationCount,
  finalClassification,
  usedRuleOverride = false,
}: {
  modelClassification: string;
  meatType: string;
  ruleClassification: RuleFreshnessClass;
  ruleConfidenceScore: number;
  deviationCount: number;
  finalClassification?: string;
  usedRuleOverride?: boolean;
}): string {
  const resolvedFinalClassification = finalClassification ?? modelClassification;
  const baseExplanationBuilder =
    MODEL_CLASS_EXPLANATIONS[modelClassification] ?? MODEL_CLASS_EXPLANATIONS["not fresh"];
  let explanation = baseExplanationBuilder(meatType);

  if (modelClassification !== ruleClassification) {
    explanation += ` Model/rule disagreement detected: model classified this sample as ${formatClassLabel(
      modelClassification,
    )}, while feature-rule scoring suggested ${formatClassLabel(ruleClassification)} (${Math.round(
      ruleConfidenceScore,
    )}% rule confidence).`;
  } else if (!usedRuleOverride) {
    explanation += ` Model output is the primary basis, and rule-based scoring supports this outcome (${Math.round(
      ruleConfidenceScore,
    )}% rule confidence).`;
  }

  if (usedRuleOverride && resolvedFinalClassification !== modelClassification) {
    explanation += ` Because model confidence was low and disagreed with feature-rule scoring, final classification was adjusted to ${formatClassLabel(
      resolvedFinalClassification,
    )}.`;
  } else {
    explanation += " Final classification follows the model output as the primary basis.";
  }

  if (deviationCount > 0) {
    explanation += ` ${deviationCount} deviation(s) were flagged from the fresh baseline.`;
  }

  explanation += " Freshness score is derived from model confidence and is not a direct biochemical measurement.";

  return explanation;
}
