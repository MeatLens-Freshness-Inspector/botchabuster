export const CALIBRATION_BIN_COUNT = 10;
export const HIGH_CONFIDENCE_THRESHOLD = 0.8;

export type CalibrationProbabilities = Record<string, number>;

export interface CalibrationPrediction {
  sampleId: string;
  groundTruth: string;
  predictedClass: string;
  confidence: number;
  probabilities: CalibrationProbabilities;
  modelVersionKey?: string | null;
}

export interface CalibrationAnalyticsQuery {
  modelVersionKey?: string | null;
  className?: string | null;
}

export interface CalibrationImportRecord {
  id: string;
  sourceHash: string;
  modelVersionKey: string | null;
  sampleCount: number;
  importedBy: string;
  importedAt: string;
}

export interface CalibrationModelOption {
  versionKey: string;
  displayName: string | null;
}

export interface ReliabilityBin {
  binIndex: number;
  lowerBound: number;
  upperBound: number;
  sampleCount: number;
  meanConfidence: number | null;
  observedAccuracy: number | null;
}

export interface ConfidenceDistributionBin {
  binIndex: number;
  lowerBound: number;
  upperBound: number;
  sampleCount: number;
}

export interface ClassCalibration {
  className: string;
  sampleCount: number;
  ece: number | null;
  brierScore: number | null;
  reliabilityBins: ReliabilityBin[];
}

export interface ControlledCalibrationSummary {
  sampleCount: number;
  ece: number | null;
  brierScore: number | null;
  reliabilityBins: ReliabilityBin[];
  confidenceDistribution: ConfidenceDistributionBin[];
  perClass: ClassCalibration[];
}

export type FieldDisputeStatus = "none" | "pending" | "approved" | "rejected";

export interface FieldConfidenceObservation {
  inspectionId: string;
  originalPrediction: string;
  originalConfidence: number;
  disputeStatus: FieldDisputeStatus;
  disputeDate: string | null;
  resolutionDate: string | null;
  disputeResult: string | null;
  modelVersionKey: string | null;
  denominatorAvailable?: boolean;
}

export interface FieldConfidenceBucket {
  binIndex: number;
  lowerBound: number;
  upperBound: number;
  sampleCount: number;
  disputeCount: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  disputeRate: number | null;
}

export interface HighConfidenceApprovedDispute {
  inspectionId: string;
  originalPrediction: string;
  originalConfidence: number;
  disputeResult: string | null;
  disputeDate: string | null;
  resolutionDate: string | null;
  modelVersionKey: string | null;
}

export interface FieldConfidenceMonitoring {
  buckets: FieldConfidenceBucket[];
  highConfidenceApprovedDisputes: HighConfidenceApprovedDispute[];
}

export interface CalibrationRepositoryInputs {
  predictions: CalibrationPrediction[];
  fieldObservations: FieldConfidenceObservation[];
  availableClasses: string[];
  availableModelVersions: CalibrationModelOption[];
}

export interface CalibrationAnalyticsResponse {
  filters: CalibrationAnalyticsQuery;
  availableClasses: string[];
  availableModelVersions: CalibrationModelOption[];
  controlled: ControlledCalibrationSummary;
  fieldMonitoring: FieldConfidenceMonitoring;
}

function assertNonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function assertUnitInterval(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${field} must be between 0 and 1`);
  }
  return value;
}

export function assertValidCalibrationPrediction(value: unknown): CalibrationPrediction {
  if (!value || typeof value !== "object") throw new Error("Calibration prediction must be an object");
  const prediction = value as Partial<CalibrationPrediction>;
  const sampleId = assertNonEmpty(prediction.sampleId, "sampleId");
  const groundTruth = assertNonEmpty(prediction.groundTruth, "groundTruth");
  const predictedClass = assertNonEmpty(prediction.predictedClass, "predictedClass");
  const confidence = assertUnitInterval(prediction.confidence, "confidence");

  if (!prediction.probabilities || typeof prediction.probabilities !== "object") {
    throw new Error("probabilities must be a non-empty record");
  }
  const probabilities: CalibrationProbabilities = {};
  for (const [className, probability] of Object.entries(prediction.probabilities)) {
    assertNonEmpty(className, "probability class");
    probabilities[className] = assertUnitInterval(probability, "probability");
  }
  if (Object.keys(probabilities).length === 0 || !(predictedClass in probabilities)) {
    throw new Error("probabilities must include the predicted class");
  }

  const modelVersionKey = prediction.modelVersionKey === undefined || prediction.modelVersionKey === null
    ? prediction.modelVersionKey ?? null
    : assertNonEmpty(prediction.modelVersionKey, "modelVersionKey");

  return { sampleId, groundTruth, predictedClass, confidence, probabilities, modelVersionKey };
}

export function assertValidCalibrationQuery(query: CalibrationAnalyticsQuery): CalibrationAnalyticsQuery {
  return {
    modelVersionKey: query.modelVersionKey ? assertNonEmpty(query.modelVersionKey, "modelVersionKey") : null,
    className: query.className ? assertNonEmpty(query.className, "className") : null,
  };
}
