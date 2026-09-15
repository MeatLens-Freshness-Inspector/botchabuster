export interface ModelAccuracySnapshot {
  id: string;
  modelVersionId: string;
  versionKey: string;
  displayName: string;
  snapshotDate: string;
  expectedAccuracy: number;
  observedAccuracy: number | null;
  evaluatedCount: number;
  correctCount: number;
  createdAt: string;
}

export interface CalibrationModelOption {
  versionKey: string;
  displayName: string | null;
}

export interface CalibrationReliabilityBin {
  binIndex: number;
  lowerBound: number;
  upperBound: number;
  sampleCount: number;
  meanConfidence: number | null;
  observedAccuracy: number | null;
}

export interface CalibrationConfidenceDistributionBin {
  binIndex: number;
  lowerBound: number;
  upperBound: number;
  sampleCount: number;
}

export interface CalibrationClassSummary {
  className: string;
  sampleCount: number;
  ece: number | null;
  brierScore: number | null;
  reliabilityBins: CalibrationReliabilityBin[];
}

export interface ControlledCalibrationSummary {
  sampleCount: number;
  ece: number | null;
  brierScore: number | null;
  reliabilityBins: CalibrationReliabilityBin[];
  confidenceDistribution: CalibrationConfidenceDistributionBin[];
  perClass: CalibrationClassSummary[];
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

export interface ModelCalibrationAnalytics {
  filters: {
    modelVersionKey: string | null;
    className: string | null;
  };
  availableClasses: string[];
  availableModelVersions: CalibrationModelOption[];
  controlled: ControlledCalibrationSummary;
  fieldMonitoring: FieldConfidenceMonitoring;
}
