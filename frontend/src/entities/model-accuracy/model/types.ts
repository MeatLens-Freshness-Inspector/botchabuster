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
