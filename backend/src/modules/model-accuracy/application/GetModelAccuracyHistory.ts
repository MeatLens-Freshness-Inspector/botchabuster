import { ValidationError } from "../../../shared/domain/errors/ApplicationError";
import {
  assertValidDate,
  type ModelAccuracyHistoryQuery,
  type ModelAccuracySnapshot,
} from "../domain/modelAccuracy";
import type { ModelAccuracyRepository } from "../domain/ports/ModelAccuracyRepository";

export class GetModelAccuracyHistory {
  constructor(private readonly repository: Pick<ModelAccuracyRepository, "getHistory">) {}

  async execute(input: ModelAccuracyHistoryQuery): Promise<ModelAccuracySnapshot[]> {
    let startDate: string;
    let endDate: string;
    try {
      startDate = assertValidDate(input.startDate);
      endDate = assertValidDate(input.endDate);
    } catch (error) {
      throw new ValidationError(error instanceof Error ? error.message : "Invalid date range");
    }
    const start = Date.parse(`${startDate}T00:00:00.000Z`);
    const end = Date.parse(`${endDate}T00:00:00.000Z`);

    if (start > end) throw new ValidationError("startDate must be on or before endDate");
    if ((end - start) / 86_400_000 > 366) {
      throw new ValidationError("Date range cannot exceed 366 days");
    }

    return this.repository.getHistory({ startDate, endDate });
  }
}
