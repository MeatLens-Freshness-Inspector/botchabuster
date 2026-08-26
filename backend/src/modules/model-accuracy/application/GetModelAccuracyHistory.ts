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
    const startDate = assertValidDate(input.startDate);
    const endDate = assertValidDate(input.endDate);
    const start = Date.parse(`${startDate}T00:00:00.000Z`);
    const end = Date.parse(`${endDate}T00:00:00.000Z`);

    if (start > end) throw new ValidationError("startDate must be on or before endDate");
    if ((end - start) / 86_400_000 > 366) {
      throw new ValidationError("Date range cannot exceed 366 days");
    }

    return this.repository.getHistory({ startDate, endDate });
  }
}
