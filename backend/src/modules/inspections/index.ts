/** Inspections module public surface. */
export {
  InspectionService,
  inspectionService,
} from "./infrastructure/InspectionService";
export type { InspectionScope } from "./infrastructure/InspectionService";

export { InspectionId } from "./domain/InspectionId";
export { GetInspectionById } from "./application/GetInspectionById";
export type {
  GetInspectionByIdRequest,
  InspectionRecord,
  InspectionRepository,
} from "./domain/ports/InspectionRepository";
export { InspectionServiceGateway } from "./infrastructure/InspectionServiceGateway";
export { GetInspectionController } from "./presentation/controllers/GetInspectionController";
export { InspectionView } from "./presentation/views/InspectionView";
