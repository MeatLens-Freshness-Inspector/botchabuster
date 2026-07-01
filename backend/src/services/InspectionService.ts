import { supabase } from "../integrations/supabase";
import type { Inspection, InspectionInsert } from "../types/inspection";
import { mergeInspectionCoordinates } from "../types/inspectionCoordinates";
import { mergeInspectionPreScanFields } from "../types/inspectionPreScan";

export type InspectionScope = "mine" | "all";

type CreateInspectionResult = {
  inspection: Inspection;
  created: boolean;
};

type SupabaseWriteError = {
  code?: string | null;
  message: string;
};

type InspectionInsertPayload = {
  user_id: string;
  client_submission_id: string;
  meat_type: InspectionInsert["meat_type"];
  classification: InspectionInsert["classification"];
  confidence_score: number;
  captured_at?: string;
  flagged_deviations?: string[];
  explanation?: string | null;
  image_url?: string | null;
  location?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  stall_number?: string | null;
  meat_inspection_certificate_proof?: string | null;
  meat_expiry_date?: string | null;
  storage_correct?: boolean | null;
  light_color_correct?: boolean | null;
  light_color_observed?: string | null;
  area_clean?: boolean | null;
  inspection_decision_source?: InspectionInsert["inspection_decision_source"];
  protocol_spoiled_reason?: string | null;
  inspector_notes?: string | null;
};

export class InspectionService {
  private static instance: InspectionService;
  private readonly tableName = "inspections";

  private constructor() {}

  static getInstance(): InspectionService {
    if (!InspectionService.instance) {
      InspectionService.instance = new InspectionService();
    }
    return InspectionService.instance;
  }

  private shouldViewAll(scope: InspectionScope, isAdmin: boolean): boolean {
    return scope === "all" && isAdmin;
  }

  async getAll(limit = 50, offset = 0, userId: string, scope: InspectionScope = "mine", isAdmin = false): Promise<Inspection[]> {
    let query = supabase
      .from(this.tableName)
      .select("*");

    if (!this.shouldViewAll(scope, isAdmin)) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch inspections: ${error.message}`);
    return (data as unknown as Inspection[]) ?? [];
  }

  async getById(id: string, userId: string, scope: InspectionScope = "mine", isAdmin = false): Promise<Inspection | null> {
    let query = supabase
      .from(this.tableName)
      .select("*")
      .eq("id", id);

    if (!this.shouldViewAll(scope, isAdmin)) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw new Error(`Failed to fetch inspection: ${error.message}`);
    return data as unknown as Inspection | null;
  }

  async create(inspection: InspectionInsert, userId: string): Promise<CreateInspectionResult> {
    const clientSubmissionId = inspection.client_submission_id?.trim();
    if (!clientSubmissionId) {
      throw new Error("client_submission_id is required");
    }

    const existingInspection = await this.getByClientSubmissionId(clientSubmissionId, userId);
    if (existingInspection) {
      return { inspection: existingInspection, created: false };
    }

    const inspectionPayload = this.buildInsertPayload(inspection, userId, clientSubmissionId);

    const { data, error } = await (supabase
      .from(this.tableName) as any)
      .insert(inspectionPayload)
      .select()
      .single();

    if (error) {
      if (this.isDuplicateClientSubmissionError(error)) {
        const duplicateInspection = await this.getByClientSubmissionId(clientSubmissionId, userId);
        if (duplicateInspection) {
          return { inspection: duplicateInspection, created: false };
        }
      }

      throw new Error(`Failed to create inspection: ${error.message}`);
    }

    return { inspection: data as unknown as Inspection, created: true };
  }

  async delete(id: string, userId: string, isAdmin = false): Promise<void> {
    let query = supabase
      .from(this.tableName)
      .delete()
      .eq("id", id);

    if (!isAdmin) {
      query = query.eq("user_id", userId);
    }

    const { error } = await query;

    if (error) throw new Error(`Failed to delete inspection: ${error.message}`);
  }

  async getStatistics(userId: string, scope?: InspectionScope, isAdmin?: boolean): Promise<{
    total: number;
    byClassification: Record<string, number>;
  }> {
    let query = supabase
      .from(this.tableName)
      .select("classification");

    if (!this.shouldViewAll(scope ?? "mine", isAdmin ?? false)) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch statistics: ${error.message}`);

    const records = (data ?? []) as unknown as { classification: string }[];
    const byClassification: Record<string, number> = {};
    for (const record of records) {
      byClassification[record.classification] = (byClassification[record.classification] || 0) + 1;
    }

    return { total: records.length, byClassification };
  }

  private async getByClientSubmissionId(clientSubmissionId: string, userId: string): Promise<Inspection | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select("*")
      .eq("client_submission_id", clientSubmissionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch inspection by client submission ID: ${error.message}`);
    return data as unknown as Inspection | null;
  }

  private isDuplicateClientSubmissionError(error: SupabaseWriteError): boolean {
    return error.code === "23505" && error.message.includes("client_submission_id");
  }

  private buildInsertPayload(
    inspection: InspectionInsert,
    userId: string,
    clientSubmissionId: string,
  ): InspectionInsertPayload {
    let payload: InspectionInsertPayload = {
      user_id: userId,
      client_submission_id: clientSubmissionId,
      meat_type: inspection.meat_type,
      classification: inspection.classification,
      confidence_score: inspection.confidence_score,
    };

    if (inspection.captured_at !== undefined) payload.captured_at = inspection.captured_at;
    if (inspection.flagged_deviations !== undefined) payload.flagged_deviations = inspection.flagged_deviations;
    if (inspection.explanation !== undefined) payload.explanation = inspection.explanation;
    if (inspection.image_url !== undefined) payload.image_url = inspection.image_url;
    if (inspection.location !== undefined) payload.location = inspection.location;
    if (inspection.inspector_notes !== undefined) payload.inspector_notes = inspection.inspector_notes;

    payload = mergeInspectionCoordinates(payload, {
      location_latitude: inspection.location_latitude,
      location_longitude: inspection.location_longitude,
    });

    return mergeInspectionPreScanFields(payload, {
      stall_number: inspection.stall_number,
      meat_inspection_certificate_proof: inspection.meat_inspection_certificate_proof,
      meat_expiry_date: inspection.meat_expiry_date,
      storage_correct: inspection.storage_correct,
      light_color_correct: inspection.light_color_correct,
      light_color_observed: inspection.light_color_observed,
      area_clean: inspection.area_clean,
      inspection_decision_source: inspection.inspection_decision_source,
      protocol_spoiled_reason: inspection.protocol_spoiled_reason,
    });
  }
}

export const inspectionService = InspectionService.getInstance();
