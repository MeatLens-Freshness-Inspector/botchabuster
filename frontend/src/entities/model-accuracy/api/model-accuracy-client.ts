import { IS_DEMO_MODE, demoDelay } from "@/shared/config/demo-mode";
import { fetchWithTimeout } from "@/shared/api";
import { API_BASE_URL } from "@/shared/api/base-url";
import { createAuthHeaders } from "@/shared/api/auth-headers";
import { notifyApiAuthExpired } from "@/shared/api/request";
import type {
  CalibrationConfidenceDistributionBin,
  CalibrationModelOption,
  CalibrationReliabilityBin,
  FieldConfidenceBucket,
  HighConfidenceApprovedDispute,
  ModelAccuracySnapshot,
  ModelCalibrationAnalytics,
} from "../model/types";

function isFiniteUnitValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isSnapshot(value: unknown): value is ModelAccuracySnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<ModelAccuracySnapshot>;
  return (
    typeof snapshot.id === "string" &&
    typeof snapshot.modelVersionId === "string" &&
    typeof snapshot.versionKey === "string" &&
    typeof snapshot.displayName === "string" &&
    isDate(snapshot.snapshotDate) &&
    isFiniteUnitValue(snapshot.expectedAccuracy) &&
    (snapshot.observedAccuracy === null || isFiniteUnitValue(snapshot.observedAccuracy)) &&
    Number.isInteger(snapshot.evaluatedCount) &&
    typeof snapshot.evaluatedCount === "number" &&
    snapshot.evaluatedCount >= 0 &&
    Number.isInteger(snapshot.correctCount) &&
    typeof snapshot.correctCount === "number" &&
    snapshot.correctCount >= 0 &&
    snapshot.correctCount <= snapshot.evaluatedCount &&
    typeof snapshot.createdAt === "string"
  );
}

function isReliabilityBin(value: unknown): value is CalibrationReliabilityBin {
  if (!value || typeof value !== "object") return false;
  const bin = value as Partial<CalibrationReliabilityBin>;
  return Number.isInteger(bin.binIndex) &&
    isFiniteUnitValue(bin.lowerBound) &&
    isFiniteUnitValue(bin.upperBound) &&
    Number.isInteger(bin.sampleCount) && bin.sampleCount >= 0 &&
    (bin.meanConfidence === null || isFiniteUnitValue(bin.meanConfidence)) &&
    (bin.observedAccuracy === null || isFiniteUnitValue(bin.observedAccuracy));
}

function isDistributionBin(value: unknown): value is CalibrationConfidenceDistributionBin {
  if (!value || typeof value !== "object") return false;
  const bin = value as Partial<CalibrationConfidenceDistributionBin>;
  return Number.isInteger(bin.binIndex) &&
    isFiniteUnitValue(bin.lowerBound) &&
    isFiniteUnitValue(bin.upperBound) &&
    Number.isInteger(bin.sampleCount) && bin.sampleCount >= 0;
}

function isModelOption(value: unknown): value is CalibrationModelOption {
  if (!value || typeof value !== "object") return false;
  const option = value as Partial<CalibrationModelOption>;
  return typeof option.versionKey === "string" &&
    (option.displayName === null || typeof option.displayName === "string");
}

function isFieldBucket(value: unknown): value is FieldConfidenceBucket {
  if (!value || typeof value !== "object") return false;
  const bucket = value as Partial<FieldConfidenceBucket>;
  return Number.isInteger(bucket.binIndex) &&
    isFiniteUnitValue(bucket.lowerBound) &&
    isFiniteUnitValue(bucket.upperBound) &&
    ["sampleCount", "disputeCount", "approvedCount", "rejectedCount", "pendingCount"]
      .every((key) => Number.isInteger(bucket[key as keyof FieldConfidenceBucket]) && (bucket[key as keyof FieldConfidenceBucket] as number) >= 0) &&
    (bucket.disputeRate === null || isFiniteUnitValue(bucket.disputeRate));
}

function isHighConfidenceDispute(value: unknown): value is HighConfidenceApprovedDispute {
  if (!value || typeof value !== "object") return false;
  const dispute = value as Partial<HighConfidenceApprovedDispute>;
  return typeof dispute.inspectionId === "string" &&
    typeof dispute.originalPrediction === "string" &&
    isFiniteUnitValue(dispute.originalConfidence) &&
    (dispute.disputeResult === null || typeof dispute.disputeResult === "string") &&
    (dispute.disputeDate === null || typeof dispute.disputeDate === "string") &&
    (dispute.resolutionDate === null || typeof dispute.resolutionDate === "string") &&
    (dispute.modelVersionKey === null || typeof dispute.modelVersionKey === "string");
}

function isCalibrationAnalytics(value: unknown): value is ModelCalibrationAnalytics {
  if (!value || typeof value !== "object") return false;
  const analytics = value as Partial<ModelCalibrationAnalytics>;
  const controlled = analytics.controlled;
  const fieldMonitoring = analytics.fieldMonitoring;
  return Boolean(analytics.filters &&
    typeof analytics.filters.modelVersionKey === "string" || analytics.filters?.modelVersionKey === null) &&
    Boolean(analytics.filters &&
      typeof analytics.filters.className === "string" || analytics.filters?.className === null) &&
    Array.isArray(analytics.availableClasses) && analytics.availableClasses.every((item) => typeof item === "string") &&
    Array.isArray(analytics.availableModelVersions) && analytics.availableModelVersions.every(isModelOption) &&
    Boolean(controlled && Number.isInteger(controlled.sampleCount) && controlled.sampleCount >= 0 &&
      (controlled.ece === null || isFiniteUnitValue(controlled.ece)) &&
      (controlled.brierScore === null || Number.isFinite(controlled.brierScore)) &&
      Array.isArray(controlled.reliabilityBins) && controlled.reliabilityBins.every(isReliabilityBin) &&
      Array.isArray(controlled.confidenceDistribution) && controlled.confidenceDistribution.every(isDistributionBin) &&
      Array.isArray(controlled.perClass)) &&
    Boolean(fieldMonitoring && Array.isArray(fieldMonitoring.buckets) && fieldMonitoring.buckets.every(isFieldBucket) &&
      Array.isArray(fieldMonitoring.highConfidenceApprovedDisputes) && fieldMonitoring.highConfidenceApprovedDisputes.every(isHighConfidenceDispute));
}

async function readApiError(response: Response, fallback: string): Promise<Error> {
  let message = response.statusText || `HTTP ${response.status}`;
  try {
    const payload = await response.json() as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) message = payload.error.trim();
  } catch {
    // Use the response status when the API does not return JSON.
  }
  return new Error(`${fallback}: ${message}`);
}

export class ModelAccuracyClient {
  private static instance: ModelAccuracyClient;

  private constructor() {}

  static getInstance(): ModelAccuracyClient {
    if (!ModelAccuracyClient.instance) {
      ModelAccuracyClient.instance = new ModelAccuracyClient();
    }
    return ModelAccuracyClient.instance;
  }

  async getHistory(startDate: string, endDate: string): Promise<ModelAccuracySnapshot[]> {
    if (IS_DEMO_MODE) return demoDelay([]);

    const params = new URLSearchParams({ startDate, endDate });
    const response = await fetchWithTimeout(`${API_BASE_URL}/model-accuracy/history?${params.toString()}`, {
      headers: createAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) notifyApiAuthExpired();
      let message = response.statusText || `HTTP ${response.status}`;
      try {
        const payload = await response.json() as { error?: unknown };
        if (typeof payload.error === "string" && payload.error.trim()) message = payload.error.trim();
      } catch {
        // Use the response status when the API does not return JSON.
      }
      throw new Error(`Failed to fetch model accuracy history: ${message}`);
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload) || !payload.every(isSnapshot)) {
      throw new Error("Invalid snapshot response");
    }

    return payload;
  }

  async getCalibrationAnalytics(
    modelVersionKey?: string | null,
    className?: string | null,
  ): Promise<ModelCalibrationAnalytics> {
    if (IS_DEMO_MODE) {
      return demoDelay({
        filters: { modelVersionKey: modelVersionKey ?? null, className: className ?? null },
        availableClasses: [],
        availableModelVersions: [],
        controlled: {
          sampleCount: 0,
          ece: null,
          brierScore: null,
          reliabilityBins: [],
          confidenceDistribution: [],
          perClass: [],
        },
        fieldMonitoring: { buckets: [], highConfidenceApprovedDisputes: [] },
      });
    }

    const params = new URLSearchParams();
    if (modelVersionKey) params.set("modelVersionKey", modelVersionKey);
    if (className) params.set("className", className);
    const query = params.toString();
    const response = await fetchWithTimeout(`${API_BASE_URL}/model-accuracy/calibration${query ? `?${query}` : ""}`, {
      headers: createAuthHeaders(),
    });
    if (!response.ok) {
      if (response.status === 401) notifyApiAuthExpired();
      throw await readApiError(response, "Failed to fetch model calibration analytics");
    }
    const payload: unknown = await response.json();
    if (!isCalibrationAnalytics(payload)) throw new Error("Invalid model calibration analytics response");
    return payload;
  }

  async importCalibrationPackage(file: File): Promise<unknown> {
    if (IS_DEMO_MODE) return demoDelay(null);
    const formData = new FormData();
    formData.append("package", file);
    const response = await fetchWithTimeout(`${API_BASE_URL}/model-accuracy/calibration/import`, {
      method: "POST",
      headers: createAuthHeaders(),
      body: formData,
    });
    if (!response.ok) {
      if (response.status === 401) notifyApiAuthExpired();
      throw await readApiError(response, "Failed to import calibration package");
    }
    return response.json();
  }
}

export const modelAccuracyClient = ModelAccuracyClient.getInstance();
