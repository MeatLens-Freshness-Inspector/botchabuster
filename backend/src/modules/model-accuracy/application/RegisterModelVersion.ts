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
    const versionKey = input.versionKey?.trim();
    const displayName = input.displayName?.trim();
    const createdBy = input.createdBy?.trim();
    if (!versionKey) throw new ValidationError("versionKey is required");
    if (!displayName) throw new ValidationError("displayName is required");
    if (!createdBy) throw new ValidationError("createdBy is required");

    return this.repository.registerModelVersion({
      versionKey,
      displayName,
      expectedAccuracy: assertValidAccuracy(input.expectedAccuracy),
      activeFrom: assertValidIsoDateTime(input.activeFrom),
      createdBy,
    });
  }
}
