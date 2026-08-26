import { ValidationError } from "../../../shared/domain/errors/ApplicationError";
import { assertValidDate, type ModelAccuracySnapshot } from "../domain/modelAccuracy";
import type { ModelAccuracyRepository } from "../domain/ports/ModelAccuracyRepository";

export interface CaptureModelAccuracySnapshotsInput {
  snapshotDate?: string;
}

export class CaptureModelAccuracySnapshots {
  constructor(private readonly repository: Pick<ModelAccuracyRepository, "captureSnapshots">) {}

  execute(input: CaptureModelAccuracySnapshotsInput = {}): Promise<ModelAccuracySnapshot[]> {
    let snapshotDate: string;
    try {
      snapshotDate = input.snapshotDate
        ? assertValidDate(input.snapshotDate)
        : new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    } catch (error) {
      throw new ValidationError(error instanceof Error ? error.message : "Invalid snapshot date");
    }
    const today = new Date().toISOString().slice(0, 10);
    if (snapshotDate > today) throw new ValidationError("snapshotDate cannot be in the future");

    return this.repository.captureSnapshots(snapshotDate);
  }
}
