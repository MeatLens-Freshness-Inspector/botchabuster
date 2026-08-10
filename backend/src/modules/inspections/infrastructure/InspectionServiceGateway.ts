import type { InspectionScope } from "./InspectionService";
import type {
  GetInspectionByIdRequest,
  InspectionRecord,
  InspectionRepository,
} from "../domain/ports/InspectionRepository";

interface InspectionDataSource {
  getById(
    id: string,
    userId: string,
    scope: InspectionScope,
    isAdmin: boolean,
  ): Promise<InspectionRecord | null>;
}

export class InspectionServiceGateway implements InspectionRepository {
  constructor(private readonly dataSource: InspectionDataSource) {}

  getById(request: GetInspectionByIdRequest): Promise<InspectionRecord | null> {
    return this.dataSource.getById(
      request.inspectionId,
      request.userId,
      request.includeAll ? "all" : "mine",
      request.includeAll,
    );
  }
}
