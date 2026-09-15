import {
  assertValidCalibrationQuery,
  buildClassCalibration,
  buildConfidenceDistribution,
  buildFieldConfidenceMonitoring,
  buildReliabilityBins,
  calculateBrierScore,
  calculateEce,
  type CalibrationAnalyticsQuery,
  type CalibrationAnalyticsResponse,
} from "../domain/modelCalibration";
import type { ModelAccuracyRepository } from "../domain/ports/ModelAccuracyRepository";

export class GetModelCalibrationAnalytics {
  constructor(private readonly repository: ModelAccuracyRepository) {}

  async execute(query: CalibrationAnalyticsQuery): Promise<CalibrationAnalyticsResponse> {
    const normalizedQuery = assertValidCalibrationQuery(query);
    const inputs = await this.repository.getCalibrationInputs(normalizedQuery);
    if (normalizedQuery.className && !inputs.availableClasses.includes(normalizedQuery.className)) {
      throw new Error(`Unknown calibration class: ${normalizedQuery.className}`);
    }
    if (
      normalizedQuery.modelVersionKey &&
      !inputs.availableModelVersions.some((version) => version.versionKey === normalizedQuery.modelVersionKey)
    ) {
      throw new Error(`Unknown calibration model version: ${normalizedQuery.modelVersionKey}`);
    }

    const selectedClass = normalizedQuery.className;
    const predictions = inputs.predictions;
    const controlled = {
      sampleCount: predictions.length,
      ece: calculateEce(predictions, selectedClass),
      brierScore: calculateBrierScore(predictions, selectedClass),
      reliabilityBins: buildReliabilityBins(predictions, selectedClass),
      confidenceDistribution: buildConfidenceDistribution(predictions, selectedClass),
      perClass: (selectedClass ? [selectedClass] : inputs.availableClasses)
        .map((className) => buildClassCalibration(predictions, className)),
    };

    return {
      filters: normalizedQuery,
      availableClasses: inputs.availableClasses,
      availableModelVersions: inputs.availableModelVersions,
      controlled,
      fieldMonitoring: buildFieldConfidenceMonitoring(inputs.fieldObservations),
    };
  }
}
