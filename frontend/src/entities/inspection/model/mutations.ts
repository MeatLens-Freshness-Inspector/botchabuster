import type { AnalysisResult, InspectionDecisionSource, InspectionInsert } from "./types";
import {
  PROTOCOL_SPOILED_REASON,
  toInspectionPreScanPayload,
  type InspectionPreScanForm,
} from "./pre-scan";

export interface InspectionSubmissionCoordinates {
  latitude: number;
  longitude: number;
}

export interface InspectionSubmissionInput {
  userId: string;
  submissionId: string;
  capturedAt: string;
  location: string | null;
  coordinates: InspectionSubmissionCoordinates | null;
  decisionSource: InspectionDecisionSource;
  preScanForm: InspectionPreScanForm;
  result: AnalysisResult;
  imageUrl?: string | null;
}

export function buildInspectionInsert({
  userId,
  submissionId,
  capturedAt,
  location,
  coordinates,
  decisionSource,
  preScanForm,
  result,
  imageUrl = null,
}: InspectionSubmissionInput): InspectionInsert {
  const preScanPayload = toInspectionPreScanPayload(preScanForm);
  const hasPreScan = Object.values(preScanPayload).some((value) => value != null);
  const regulatoryCompliance = hasPreScan
    ? (preScanPayload.storage_correct === true &&
        preScanPayload.light_color_correct === true &&
        preScanPayload.area_clean === true)
    : null;

  return {
    user_id: userId,
    client_submission_id: submissionId,
    meat_type: "pork",
    location: location?.trim() || null,
    location_latitude: coordinates?.latitude ?? null,
    location_longitude: coordinates?.longitude ?? null,
    ...preScanPayload,
    regulatory_compliance: regulatoryCompliance,
    inspection_decision_source: decisionSource,
    protocol_spoiled_reason:
      decisionSource === "protocol_pre_scan" ? PROTOCOL_SPOILED_REASON : null,
    captured_at: capturedAt,
    classification: result.classification,
    confidence_score: result.confidence_score,
    flagged_deviations: result.flagged_deviations,
    explanation: result.explanation,
    image_url: imageUrl,
  };
}
