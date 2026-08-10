import { NotFoundError } from "../../../shared/domain/errors/ApplicationError";
import { InspectionId } from "../domain/InspectionId";
import type {
  GetInspectionByIdRequest,
  InspectionRecord,
  InspectionRepository,
} from "../domain/ports/InspectionRepository";

export class GetInspectionById {
  constructor(private readonly inspectionRepository: InspectionRepository) {}

  async execute(input: GetInspectionByIdRequest): Promise<InspectionRecord> {
    const inspectionId = InspectionId.create(input.inspectionId);
    const inspection = await this.inspectionRepository.getById({
      ...input,
      inspectionId: inspectionId.value,
    });

    if (!inspection) {
      throw new NotFoundError("Inspection");
    }

    return inspection;
  }
}
