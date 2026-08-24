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
export { ApplyDisputeToDeveloperDataset } from "./application/ApplyDisputeToDeveloperDataset";
export { ListInspectionResultDisputes } from "./application/ListInspectionResultDisputes";
export { ListPendingInspectionResultDisputes } from "./application/ListPendingInspectionResultDisputes";
export { ReviewInspectionResultDispute } from "./application/ReviewInspectionResultDispute";
export { SubmitInspectionResultDispute } from "./application/SubmitInspectionResultDispute";
export { InspectionResultDisputeService, inspectionResultDisputeService } from "./infrastructure/InspectionResultDisputeService";
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
