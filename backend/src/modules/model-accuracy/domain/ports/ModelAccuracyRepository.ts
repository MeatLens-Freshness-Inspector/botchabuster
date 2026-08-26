import type {
  ModelAccuracyHistoryQuery,
  ModelAccuracySnapshot,
  ModelVersion,
  RegisterModelVersionInput,
} from "../modelAccuracy";

export interface ModelAccuracyRepository {
  registerModelVersion(input: RegisterModelVersionInput): Promise<ModelVersion>;
  getHistory(query: ModelAccuracyHistoryQuery): Promise<ModelAccuracySnapshot[]>;
  captureSnapshots(snapshotDate: string): Promise<ModelAccuracySnapshot[]>;
}
