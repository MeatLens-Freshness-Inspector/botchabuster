import { formatInspectionLocationLabel } from "@/lib/inspectionLocation";
import { resolveReportOrganization } from "@/lib/reportOrganizations";
import { buildInspectorDailyReportModel } from "@/lib/reports/adapters/inspectorDailyReport";
import type { ReportDocumentModel } from "@/lib/reports/types";
import type {
  FreshnessClassification,
  Inspection,
} from "@/types/inspection";
import type {
  DetailedHistoryReportInput,
  HistoryFilterOption,
} from "../types";

export const HISTORY_FILTER_OPTIONS: HistoryFilterOption[] = [
  { key: "all", label: "All" },
  { key: "fresh", label: "Fresh" },
  { key: "not fresh", label: "Not Fresh" },
  { key: "acceptable", label: "Acceptable" },
  { key: "warning", label: "Warning" },
  { key: "spoiled", label: "Spoiled" },
];

export const HISTORY_CLASSIFICATIONS: FreshnessClassification[] = [
  "fresh",
  "not fresh",
  "acceptable",
  "warning",
  "spoiled",
];

export function buildDetailedHistoryReportPdfModel(
  input: DetailedHistoryReportInput,
): ReportDocumentModel {
  return buildInspectorDailyReportModel({
    reportOrganization: resolveReportOrganization(input.reportOrganization),
    selectedReportDay: input.selectedReportDay,
    generatedAt: input.generatedAt,
    averageConfidence: input.averageConfidence,
    inspections: input.inspections.map((inspection) => ({
      id: inspection.id,
      created_at: inspection.created_at,
      captured_at: inspection.captured_at ?? null,
      meat_type: inspection.meat_type,
      classification: inspection.classification,
      confidence_score: inspection.confidence_score,
      location:
        formatInspectionLocationLabel(
          inspection.location,
          inspection.location_latitude,
          inspection.location_longitude,
        ) ?? inspection.location,
      image_url: inspection.image_url,
    })),
  });
}

export function getHistoryClassificationColorClass(
  classification: FreshnessClassification,
): string {
  if (classification === "fresh") return "bg-fresh";
  if (classification === "not fresh") return "bg-warning";
  if (classification === "acceptable") return "bg-acceptable";
  if (classification === "warning") return "bg-warning";
  return "bg-spoiled";
}

export function buildHistorySearchText(inspection: Inspection): string {
  const locationLabel = formatInspectionLocationLabel(
    inspection.location,
    inspection.location_latitude,
    inspection.location_longitude,
  );

  return [
    inspection.meat_type,
    inspection.location ?? "",
    locationLabel,
    inspection.classification,
    inspection.id,
  ]
    .join(" ")
    .toLowerCase();
}
