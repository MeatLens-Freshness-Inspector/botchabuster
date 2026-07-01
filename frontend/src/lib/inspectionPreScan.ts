import type {
  AnalysisResult,
  InspectionDecisionSource,
  InspectionInsert,
} from "@/types/inspection";

export const PROTOCOL_SPOILED_REASON = "failed_pre_scan_safety_protocol";

export type InspectionPreScanChoice = "" | "yes" | "no";

export interface InspectionPreScanForm {
  stallNumber: string;
  meatInspectionCertificateProof: string;
  meatExpiryDate: string;
  storageCorrect: InspectionPreScanChoice;
  lightColorCorrect: InspectionPreScanChoice;
  lightColorObserved: string;
  areaClean: InspectionPreScanChoice;
}

function normalizeText(value: string): string {
  return value.trim();
}

function toBoolean(value: InspectionPreScanChoice): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

export function createEmptyPreScanForm(): InspectionPreScanForm {
  return {
    stallNumber: "",
    meatInspectionCertificateProof: "",
    meatExpiryDate: "",
    storageCorrect: "",
    lightColorCorrect: "",
    lightColorObserved: "",
    areaClean: "",
  };
}

export function isPreScanChecklistComplete(form: InspectionPreScanForm): boolean {
  if (!normalizeText(form.stallNumber)) return false;
  if (!normalizeText(form.meatInspectionCertificateProof)) return false;
  if (!normalizeText(form.meatExpiryDate)) return false;
  if (!form.storageCorrect) return false;
  if (!form.lightColorCorrect) return false;
  if (!form.areaClean) return false;

  if (form.lightColorCorrect === "no" && !normalizeText(form.lightColorObserved)) {
    return false;
  }

  return true;
}

export function hasProtocolFailure(form: InspectionPreScanForm): boolean {
  return (
    form.storageCorrect === "no" ||
    form.lightColorCorrect === "no" ||
    form.areaClean === "no"
  );
}

export function getInspectionDecisionSource(
  form: InspectionPreScanForm,
): InspectionDecisionSource {
  return hasProtocolFailure(form) ? "protocol_pre_scan" : "ai";
}

export function buildProtocolSpoiledAnalysisResult(): AnalysisResult {
  return {
    classification: "spoiled",
    confidence_score: 100,
    flagged_deviations: [PROTOCOL_SPOILED_REASON],
    explanation:
      "Automatically classified as spoiled due to failed pre-scan safety protocol. AI analysis was skipped.",
  };
}

export function toInspectionPreScanPayload(
  form: InspectionPreScanForm,
): Pick<
  InspectionInsert,
  | "stall_number"
  | "meat_inspection_certificate_proof"
  | "meat_expiry_date"
  | "storage_correct"
  | "light_color_correct"
  | "light_color_observed"
  | "area_clean"
> {
  return {
    stall_number: normalizeText(form.stallNumber) || null,
    meat_inspection_certificate_proof:
      normalizeText(form.meatInspectionCertificateProof) || null,
    meat_expiry_date: normalizeText(form.meatExpiryDate) || null,
    storage_correct: toBoolean(form.storageCorrect),
    light_color_correct: toBoolean(form.lightColorCorrect),
    light_color_observed:
      form.lightColorCorrect === "no"
        ? normalizeText(form.lightColorObserved) || null
        : null,
    area_clean: toBoolean(form.areaClean),
  };
}
