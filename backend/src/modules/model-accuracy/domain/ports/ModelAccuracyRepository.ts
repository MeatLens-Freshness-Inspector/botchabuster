import type {
  ModelAccuracyHistoryQuery,
  ModelAccuracySnapshot,
  ModelVersion,
  RegisterModelVersionInput,
} from "../modelAccuracy";
import type {
  CalibrationAnalyticsQuery,
  CalibrationImportRecord,
  CalibrationModelOption,
  CalibrationPrediction,
  FieldConfidenceObservation,
} from "../modelCalibration";

export interface ImportCalibrationPackageInput {
  sourceHash: string;
  modelVersionKey: string | null;
  predictions: CalibrationPrediction[];
  importedBy: string;
}

export interface CalibrationRepositoryInputs {
  predictions: CalibrationPrediction[];
  fieldObservations: FieldConfidenceObservation[];
  availableClasses: string[];
  availableModelVersions: CalibrationModelOption[];
}

export interface ModelAccuracyRepository {
  registerModelVersion(input: RegisterModelVersionInput): Promise<ModelVersion>;
  getHistory(query: ModelAccuracyHistoryQuery): Promise<ModelAccuracySnapshot[]>;
  captureSnapshots(snapshotDate: string): Promise<ModelAccuracySnapshot[]>;
  importCalibrationPackage(input: ImportCalibrationPackageInput): Promise<CalibrationImportRecord>;
  getCalibrationInputs(query: CalibrationAnalyticsQuery): Promise<CalibrationRepositoryInputs>;
}
