import type {
  InAppClassBreakdown,
  InAppMeatTypeBreakdown,
  InAppModelMetrics,
} from "@/integrations/api/DeveloperDashboardClient";
import type { Inspection, FreshnessClassification } from "@/types/inspection";

const ALL_CLASSES: FreshnessClassification[] = ["fresh", "acceptable", "warning", "not fresh", "spoiled"];

function normalizeClassification(value: unknown): FreshnessClassification | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "not fresh" || normalized === "not_fresh" || normalized === "notfresh") return "not fresh";
  if (normalized === "spoiled") return "spoiled";
  if (normalized === "acceptable") return "acceptable";
  if (normalized === "warning") return "warning";
  if (normalized === "fresh") return "fresh";
  return null;
}

function resolveGroundTruth(record: Inspection): FreshnessClassification {
  return normalizeClassification(record.manual_classification) ?? normalizeClassification(record.classification) ?? "fresh";
}

function buildClassBreakdown(records: Inspection[], totalEvaluated: number): InAppClassBreakdown[] {
  return ALL_CLASSES.map((cls) => {
    let modelIdentifiedCount = 0;
    let actualCount = 0;
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let tn = 0;

    for (const record of records) {
      const predicted = normalizeClassification(record.classification) ?? "fresh";
      const actual = resolveGroundTruth(record);
      const isPredictedClass = predicted === cls;
      const isActualClass = actual === cls;

      if (isPredictedClass) modelIdentifiedCount += 1;
      if (isActualClass) actualCount += 1;

      if (isPredictedClass && isActualClass) tp += 1;
      else if (isPredictedClass) fp += 1;
      else if (isActualClass) fn += 1;
      else tn += 1;
    }

    const accuracy = totalEvaluated > 0 ? (tp + tn) / totalEvaluated : 0;
    const precision = tp + fp > 0 ? tp / (tp + fp) : (actualCount === 0 && modelIdentifiedCount === 0 ? 1 : 0);
    const recall = tp + fn > 0 ? tp / (tp + fn) : (actualCount === 0 ? 1 : 0);
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      class: cls,
      modelIdentifiedCount,
      actualCount,
      tp,
      fp,
      fn,
      tn,
      accuracy,
      precision,
      recall,
      f1Score,
    };
  });
}

function buildMeatTypeBreakdown(records: Inspection[]): InAppMeatTypeBreakdown[] {
  const meatTypeStats = new Map<string, { total: number; correct: number }>();

  for (const record of records) {
    const predicted = normalizeClassification(record.classification) ?? "fresh";
    const actual = resolveGroundTruth(record);
    const meatType = record.meat_type.trim().toLowerCase() || "unknown";
    const current = meatTypeStats.get(meatType) ?? { total: 0, correct: 0 };

    current.total += 1;
    if (predicted === actual) {
      current.correct += 1;
    }

    meatTypeStats.set(meatType, current);
  }

  return Array.from(meatTypeStats.entries()).map(([meatType, stats]) => ({
    meatType,
    totalCount: stats.total,
    correctCount: stats.correct,
    accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
  }));
}

export function buildDeveloperInAppMetrics(records: Inspection[]): InAppModelMetrics {
  const totalEvaluated = records.length;
  const correctlyIdentified = records.reduce((count, record) => {
    const predicted = normalizeClassification(record.classification) ?? "fresh";
    return count + (predicted === resolveGroundTruth(record) ? 1 : 0);
  }, 0);
  const incorrectlyIdentified = totalEvaluated - correctlyIdentified;
  const inAppAccuracy = totalEvaluated > 0 ? correctlyIdentified / totalEvaluated : 0;
  const classBreakdown = buildClassBreakdown(records, totalEvaluated);
  const activeClasses = classBreakdown.filter((item) => item.actualCount > 0 || item.modelIdentifiedCount > 0);
  const classesToAverage = activeClasses.length > 0 ? activeClasses : classBreakdown;
  const precisionTotal = classesToAverage.reduce((sum, item) => sum + item.precision, 0);
  const recallTotal = classesToAverage.reduce((sum, item) => sum + item.recall, 0);
  const inAppPrecision = classesToAverage.length > 0 ? precisionTotal / classesToAverage.length : 1;
  const inAppRecall = classesToAverage.length > 0 ? recallTotal / classesToAverage.length : 1;
  const inAppF1Score =
    inAppPrecision + inAppRecall > 0
      ? (2 * inAppPrecision * inAppRecall) / (inAppPrecision + inAppRecall)
      : 0;

  return {
    totalEvaluated,
    correctlyIdentified,
    incorrectlyIdentified,
    inAppAccuracy,
    inAppPrecision,
    inAppRecall,
    inAppF1Score,
    classBreakdown,
    meatTypeBreakdown: buildMeatTypeBreakdown(records),
  };
}
