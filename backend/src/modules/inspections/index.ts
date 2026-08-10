/** Inspections module public surface. */
export {
  InspectionService,
  inspectionService,
} from "./infrastructure/InspectionService";
export type { InspectionScope } from "./infrastructure/InspectionService";

export { InspectionId } from "./domain/InspectionId";
export { GetInspectionById } from "./application/GetInspectionById";
export { ListInspections } from "./application/ListInspections";
export { GetInspectionStatistics } from "./application/GetInspectionStatistics";
export { CreateInspection } from "./application/CreateInspection";
export { DeleteInspection } from "./application/DeleteInspection";
export type {
  GetInspectionByIdRequest,
  InspectionRecord,
  InspectionRepository,
} from "./domain/ports/InspectionRepository";
export { InspectionServiceGateway } from "./infrastructure/InspectionServiceGateway";
export { GetInspectionController } from "./presentation/controllers/GetInspectionController";
export { InspectionView } from "./presentation/views/InspectionView";
export { default as inspectionRoutes } from "./presentation/routes";
export { InspectionController } from "./presentation/controllers/InspectionController";
