/** Inspections module public surface. */
export {};

export { InspectionId } from "./domain/InspectionId";
export { GetInspectionById } from "./application/GetInspectionById";
export type {
  GetInspectionByIdRequest,
  InspectionRecord,
  InspectionRepository,
} from "./domain/ports/InspectionRepository";
