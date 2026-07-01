export type FreshnessClassification = 'fresh' | 'not fresh' | 'spoiled' | 'acceptable' | 'warning';
export type MeatType = 'pork' | 'beef' | 'chicken' | 'fish' | 'other';
export type InspectionDecisionSource = 'ai' | 'protocol_pre_scan';

export interface Inspection {
  id: string;
  user_id: string | null;
  meat_type: MeatType;
  classification: FreshnessClassification;
  confidence_score: number;
  flagged_deviations: string[];
  explanation: string | null;
  image_url: string | null;
  location: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  stall_number?: string | null;
  meat_inspection_certificate_proof?: string | null;
  meat_expiry_date?: string | null;
  storage_correct?: boolean | null;
  light_color_correct?: boolean | null;
  light_color_observed?: string | null;
  area_clean?: boolean | null;
  inspection_decision_source?: InspectionDecisionSource | null;
  protocol_spoiled_reason?: string | null;
  inspector_notes: string | null;
  captured_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionInsert {
  meat_type: MeatType;
  classification: FreshnessClassification;
  confidence_score: number;
  client_submission_id: string;
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
  inspection_decision_source?: InspectionDecisionSource | null;
  protocol_spoiled_reason?: string | null;
  inspector_notes?: string | null;
  user_id?: string | null;
}

export interface AnalysisResult {
  classification: FreshnessClassification;
  confidence_score: number;
  model_confidence_score?: number | null;
  rule_confidence_score?: number | null;
  freshness_score?: number | null;
  recommendation?: "Good for Consumption" | "Consume Immediately" | "Not Suitable" | null;
  probabilities?: Partial<Record<FreshnessClassification, number>>;
  label_order?: FreshnessClassification[];
  flagged_deviations: string[];
  explanation: string;
  analysis_source?: "mobilenetv3" | "backend";
  model_path?: string | null;
}

export interface ApiConfig {
  backendUrl: string;
}
