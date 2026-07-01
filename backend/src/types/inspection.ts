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
  inspector_notes?: string | null;
  captured_at?: string;
  client_submission_id: string;
}
