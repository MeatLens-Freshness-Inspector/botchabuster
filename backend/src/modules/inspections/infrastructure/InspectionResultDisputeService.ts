import { supabase } from "../../../integrations/supabase";
import type { Inspection } from "../../../types/inspection";
import type {
  InspectionResultDispute,
  InspectionResultDisputeMutation,
  InspectionResultDisputeRecord,
  InspectionResultDisputeReviewDecision,
} from "../../../types/inspectionResultDispute";
import type {
  CreateInspectionResultDisputeInput,
  InspectionResultDisputeRepository,
} from "../domain/ports/InspectionResultDisputeRepository";

const INSPECTION_COLUMNS = "id, user_id, meat_type, classification, official_classification, manual_classification, confidence_score, flagged_deviations, explanation, image_url, location, location_latitude, location_longitude, stall_number, meat_inspection_certificate_proof, meat_expiry_date, storage_correct, light_color_correct, light_color_observed, area_clean, inspection_decision_source, protocol_spoiled_reason, regulatory_compliance, inspector_notes, client_submission_id, captured_at, created_at, updated_at";
const DISPUTE_COLUMNS = `id, inspection_id, submitted_by, expected_classification, reason, status, developer_label_applied_at, developer_label_applied_by, reviewed_at, reviewed_by, reviewer_note, created_at, updated_at, inspection:inspections(${INSPECTION_COLUMNS})`;

function mapPersistenceError(error: { code?: string | null; message: string }): Error {
  if (error.code === "23505") return new Error("A pending dispute already exists for this inspection");
  if (error.message.includes("dispute_not_found")) return new Error("Dispute not found");
  if (error.message.includes("dispute_not_pending")) return new Error("Dispute is no longer pending");
  if (error.message.includes("inspection_not_found")) return new Error("Inspection not found");
  if (error.message.includes("invalid_review_decision")) return new Error("Invalid review decision");
  return new Error(error.message);
}

function parseMutation(data: unknown): InspectionResultDisputeMutation {
  if (!data || typeof data !== "object") throw new Error("Dispute operation returned an invalid response");
  const value = data as Record<string, unknown>;
  if (!value.dispute || !value.inspection) throw new Error("Dispute operation returned incomplete data");
  return {
    dispute: value.dispute as InspectionResultDispute,
    inspection: value.inspection as Inspection,
    ...(Object.prototype.hasOwnProperty.call(value, "previous_manual_classification")
      ? { previousManualClassification: value.previous_manual_classification as Inspection["classification"] | null }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(value, "previous_official_classification")
      ? { previousOfficialClassification: value.previous_official_classification as Inspection["classification"] | null }
      : {}),
  };
}

export class InspectionResultDisputeService implements InspectionResultDisputeRepository {
  async create(input: CreateInspectionResultDisputeInput): Promise<InspectionResultDispute> {
    const { data: inspection, error: inspectionError } = await (supabase
      .from("inspections") as any)
      .select("id")
      .eq("id", input.inspectionId)
      .eq("user_id", input.submittedBy)
      .maybeSingle();

    if (inspectionError) throw new Error(`Failed to fetch inspection: ${inspectionError.message}`);
    if (!inspection) throw new Error("Inspection not found");

    const { data, error } = await (supabase
      .from("inspection_result_disputes") as any)
      .insert({
        inspection_id: input.inspectionId,
        submitted_by: input.submittedBy,
        expected_classification: input.expectedClassification,
        reason: input.reason,
      })
      .select(DISPUTE_COLUMNS)
      .single();

    if (error) throw mapPersistenceError(error);
    return data as InspectionResultDispute;
  }

  async listForInspector(submittedBy: string): Promise<InspectionResultDisputeRecord[]> {
    const { data, error } = await (supabase
      .from("inspection_result_disputes") as any)
      .select(DISPUTE_COLUMNS)
      .eq("submitted_by", submittedBy)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(500);

    if (error) throw new Error(`Failed to fetch inspection disputes: ${error.message}`);
    return (data as InspectionResultDisputeRecord[]) ?? [];
  }

  async listPendingForReview(): Promise<InspectionResultDisputeRecord[]> {
    const { data, error } = await (supabase
      .from("inspection_result_disputes") as any)
      .select(DISPUTE_COLUMNS)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(500);

    if (error) throw new Error(`Failed to fetch pending inspection disputes: ${error.message}`);
    return (data as InspectionResultDisputeRecord[]) ?? [];
  }

  async applyToDeveloperDataset(disputeId: string, actorId: string): Promise<InspectionResultDisputeMutation> {
    const { data, error } = await supabase.rpc("apply_inspection_dispute_to_developer_dataset", {
      p_dispute_id: disputeId,
      p_actor_id: actorId,
    });
    if (error) throw mapPersistenceError(error);
    return parseMutation(data);
  }

  async review(
    disputeId: string,
    actorId: string,
    decision: InspectionResultDisputeReviewDecision,
    reviewerNote: string | null,
  ): Promise<InspectionResultDisputeMutation> {
    const { data, error } = await supabase.rpc("review_inspection_result_dispute", {
      p_dispute_id: disputeId,
      p_actor_id: actorId,
      p_decision: decision,
      p_reviewer_note: reviewerNote,
    });
    if (error) throw mapPersistenceError(error);
    return parseMutation(data);
  }
}

export const inspectionResultDisputeService = new InspectionResultDisputeService();
