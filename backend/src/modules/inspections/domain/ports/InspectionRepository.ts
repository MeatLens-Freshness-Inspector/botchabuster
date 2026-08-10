export interface InspectionRecord {
  id: string;
  user_id: string;
  classification: string;
  [field: string]: unknown;
}

export interface GetInspectionByIdRequest {
  inspectionId: string;
  userId: string;
  includeAll: boolean;
}

export interface InspectionRepository {
  getById(request: GetInspectionByIdRequest): Promise<InspectionRecord | null>;
}
