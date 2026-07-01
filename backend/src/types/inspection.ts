export type InspectionDecisionSource = "ai" | "protocol_pre_scan";

export interface Inspection {
  id: string;
  user_id: string;
  meat_type: string;
  classification: "fresh" | "not fresh" | "spoiled" | "acceptable" | "warning";
  confidence_score: number;
  flagged_deviations: string[];
  explanation: string | null;
  image_url: string | null;
  location: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  stall_number: string | null;
  meat_inspection_certificate_proof: string | null;
  meat_expiry_date: string | null;
  storage_correct: boolean | null;
  light_color_correct: boolean | null;
  light_color_observed: string | null;
  area_clean: boolean | null;
  inspection_decision_source: InspectionDecisionSource | null;
  protocol_spoiled_reason: string | null;
  inspector_notes: string | null;
  client_submission_id: string | null;
  captured_at: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionInsert {
  user_id: string;
  meat_type: string;
  classification: "fresh" | "not fresh" | "spoiled" | "acceptable" | "warning";
  confidence_score: number;
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
  inspection_decision_source?: InspectionDecisionSource | null;
  protocol_spoiled_reason?: string | null;
  inspector_notes?: string | null;
  captured_at?: string;
  client_submission_id: string;
}
