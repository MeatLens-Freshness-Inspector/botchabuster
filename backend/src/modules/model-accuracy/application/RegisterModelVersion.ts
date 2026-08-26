import { ValidationError } from "../../../shared/domain/errors/ApplicationError";
import {
  assertValidAccuracy,
  assertValidIsoDateTime,
  type ModelVersion,
  type RegisterModelVersionInput,
} from "../domain/modelAccuracy";
import type { ModelAccuracyRepository } from "../domain/ports/ModelAccuracyRepository";

export class RegisterModelVersion {
  constructor(private readonly repository: Pick<ModelAccuracyRepository, "registerModelVersion">) {}

  execute(input: RegisterModelVersionInput): Promise<ModelVersion> {
    const versionKey = typeof input?.versionKey === "string" ? input.versionKey.trim() : "";
    const displayName = typeof input?.displayName === "string" ? input.displayName.trim() : "";
    const createdBy = typeof input?.createdBy === "string" ? input.createdBy.trim() : "";
    if (!versionKey) throw new ValidationError("versionKey is required");
    if (!displayName) throw new ValidationError("displayName is required");
    if (!createdBy) throw new ValidationError("createdBy is required");

    let expectedAccuracy: number;
    let activeFrom: string;
    try {
      expectedAccuracy = assertValidAccuracy(input.expectedAccuracy);
      activeFrom = assertValidIsoDateTime(input.activeFrom);
    } catch (error) {
      throw new ValidationError(error instanceof Error ? error.message : "Invalid model version");
    }

    return this.repository.registerModelVersion({
      versionKey,
      displayName,
      expectedAccuracy,
      activeFrom,
      createdBy,
    });
  }
}
