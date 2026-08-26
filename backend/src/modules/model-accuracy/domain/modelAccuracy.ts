export interface ModelVersion {
  id: string;
  versionKey: string;
  displayName: string;
  expectedAccuracy: number;
  activeFrom: string;
  retiredAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

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

export interface RegisterModelVersionInput {
  versionKey: string;
  displayName: string;
  expectedAccuracy: number;
  activeFrom: string;
  createdBy: string;
}

export interface ModelAccuracyHistoryQuery {
  startDate: string;
  endDate: string;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function assertValidAccuracy(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("Accuracy must be between 0 and 1");
  }

  return value;
}

export function assertValidDate(value: unknown): string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw new Error("Date must be YYYY-MM-DD");
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("Date must be a valid calendar date");
  }

  return value;
}

export function assertValidIsoDateTime(value: unknown): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error("activeFrom must be a valid ISO datetime");
  }

  return new Date(value).toISOString();
}
