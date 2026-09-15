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

function confidenceFor(prediction: CalibrationPrediction, className?: string | null): number {
  if (!className) return prediction.confidence;
  return prediction.probabilities[className] ?? 0;
}

function roundMetric(value: number): number {
  return Number(value.toFixed(12));
}

function isCorrect(prediction: CalibrationPrediction, className?: string | null): boolean {
  if (!className) return prediction.predictedClass === prediction.groundTruth;
  return prediction.groundTruth === className;
}

export function getConfidenceBin(confidence: number): number {
  assertUnitInterval(confidence, "confidence");
  return confidence === 1 ? CALIBRATION_BIN_COUNT - 1 : Math.floor(confidence * CALIBRATION_BIN_COUNT);
}

function createEmptyReliabilityBins(): ReliabilityBin[] {
  return Array.from({ length: CALIBRATION_BIN_COUNT }, (_, binIndex) => ({
    binIndex,
    lowerBound: binIndex / CALIBRATION_BIN_COUNT,
    upperBound: (binIndex + 1) / CALIBRATION_BIN_COUNT,
    sampleCount: 0,
    meanConfidence: null,
    observedAccuracy: null,
  }));
}

export function buildReliabilityBins(
  predictions: CalibrationPrediction[],
  className?: string | null,
): ReliabilityBin[] {
  const bins = createEmptyReliabilityBins();
  for (const prediction of predictions) {
    const bin = bins[getConfidenceBin(confidenceFor(prediction, className))];
    bin.sampleCount += 1;
    const confidence = confidenceFor(prediction, className);
    bin.meanConfidence = (bin.meanConfidence ?? 0) + confidence;
    bin.observedAccuracy = (bin.observedAccuracy ?? 0) + (isCorrect(prediction, className) ? 1 : 0);
  }

  return bins.map((bin) => bin.sampleCount === 0
    ? bin
    : {
        ...bin,
        meanConfidence: (bin.meanConfidence ?? 0) / bin.sampleCount,
        observedAccuracy: (bin.observedAccuracy ?? 0) / bin.sampleCount,
      });
}

export function calculateEce(predictions: CalibrationPrediction[], className?: string | null): number | null {
  if (predictions.length === 0) return null;
  const bins = buildReliabilityBins(predictions, className);
  return roundMetric(bins.reduce((total, bin) => {
    if (bin.sampleCount === 0 || bin.meanConfidence === null || bin.observedAccuracy === null) return total;
    return total + (bin.sampleCount / predictions.length) * Math.abs(bin.meanConfidence - bin.observedAccuracy);
  }, 0));
}

export function calculateBrierScore(predictions: CalibrationPrediction[], className?: string | null): number | null {
  if (predictions.length === 0) return null;
  const classes = className
    ? [className]
    : Array.from(new Set(predictions.flatMap((prediction) => [prediction.groundTruth, ...Object.keys(prediction.probabilities)])));

  const total = predictions.reduce((sum, prediction) => sum + classes.reduce((rowSum, currentClass) => {
    const predicted = className
      ? confidenceFor(prediction, className)
      : prediction.probabilities[currentClass] ?? 0;
    const expected = className
      ? (prediction.groundTruth === className ? 1 : 0)
      : (prediction.groundTruth === currentClass ? 1 : 0);
    return rowSum + (predicted - expected) ** 2;
  }, 0), 0);

  return roundMetric(total / predictions.length);
}

export function buildConfidenceDistribution(
  predictions: CalibrationPrediction[],
  className?: string | null,
): ConfidenceDistributionBin[] {
  return createEmptyReliabilityBins().map(({ binIndex, lowerBound, upperBound }) => ({
    binIndex,
    lowerBound,
    upperBound,
    sampleCount: predictions.filter((prediction) => getConfidenceBin(confidenceFor(prediction, className)) === binIndex).length,
  }));
}

export function buildClassCalibration(
  predictions: CalibrationPrediction[],
  className: string,
): ClassCalibration {
  return {
    className,
    sampleCount: predictions.length,
    ece: calculateEce(predictions, className),
    brierScore: calculateBrierScore(predictions, className),
    reliabilityBins: buildReliabilityBins(predictions, className),
  };
}

function createEmptyFieldBuckets(): FieldConfidenceBucket[] {
  return Array.from({ length: CALIBRATION_BIN_COUNT }, (_, binIndex) => ({
    binIndex,
    lowerBound: binIndex / CALIBRATION_BIN_COUNT,
    upperBound: (binIndex + 1) / CALIBRATION_BIN_COUNT,
    sampleCount: 0,
    disputeCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    pendingCount: 0,
    disputeRate: null,
  }));
}

export function buildFieldConfidenceMonitoring(
  observations: FieldConfidenceObservation[],
): FieldConfidenceMonitoring {
  const buckets = createEmptyFieldBuckets();
  const denominatorCounts = Array.from({ length: CALIBRATION_BIN_COUNT }, () => 0);

  for (const observation of observations) {
    const bucket = buckets[getConfidenceBin(observation.originalConfidence)];
    bucket.sampleCount += 1;
    if (observation.denominatorAvailable !== false) denominatorCounts[bucket.binIndex] += 1;
    if (observation.disputeStatus === "approved") bucket.approvedCount += 1;
    if (observation.disputeStatus === "rejected") bucket.rejectedCount += 1;
    if (observation.disputeStatus === "pending") bucket.pendingCount += 1;
    bucket.disputeCount = bucket.approvedCount + bucket.rejectedCount + bucket.pendingCount;
  }

  return {
    buckets: buckets.map((bucket) => ({
      ...bucket,
      disputeRate: denominatorCounts[bucket.binIndex] > 0
        ? roundMetric(bucket.disputeCount / denominatorCounts[bucket.binIndex])
        : null,
    })),
    highConfidenceApprovedDisputes: selectHighConfidenceApprovedDisputes(observations),
  };
}

export function selectHighConfidenceApprovedDisputes(
  observations: FieldConfidenceObservation[],
): HighConfidenceApprovedDispute[] {
  return observations
    .filter((observation) =>
      observation.disputeStatus === "approved" && observation.originalConfidence >= HIGH_CONFIDENCE_THRESHOLD,
    )
    .map((observation) => ({
      inspectionId: observation.inspectionId,
      originalPrediction: observation.originalPrediction,
      originalConfidence: observation.originalConfidence,
      disputeResult: observation.disputeResult,
      disputeDate: observation.disputeDate,
      resolutionDate: observation.resolutionDate,
      modelVersionKey: observation.modelVersionKey,
    }));
}
