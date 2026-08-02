import type { ReportOrganization } from "@/lib/reportOrganizations";
import { getTemplateKeyForOrganization } from "@/lib/reports/pdf/assets";
import {
  buildSharedMeatDetailSection,
  buildSharedMeatSummarySection,
} from "@/lib/reports/shared/meatSections";
import type { ReportDocumentModel } from "@/lib/reports/types";

type InspectorDailyInspection = {
  id: string;
  created_at: string;
  meat_type: string;
  classification: string;
  confidence_score: number;
  location: string | null;
};

export interface BuildInspectorDailyReportInput {
  reportOrganization: ReportOrganization;
  selectedReportDay: string;
  generatedAt: string;
  averageConfidence: number;
  inspections: InspectorDailyInspection[];
}

export function buildInspectorDailyReportModel(
  input: BuildInspectorDailyReportInput,
): ReportDocumentModel {
  return {
    organization: input.reportOrganization,
    templateKey: getTemplateKeyForOrganization(input.reportOrganization),
    kind: "inspector_daily",
    title: "Inspector Daily Report",
    subtitle: `Inspection Day: ${input.selectedReportDay}`,
    generatedAt: input.generatedAt,
    sections: [
      buildSharedMeatSummarySection({
        totalInspections: input.inspections.length,
        averageConfidence: input.averageConfidence,
      }),
      buildSharedMeatDetailSection({
        title: "Daily Inspection Evidence",
        columns: [
          "Captured",
          "Meat",
          "Classification",
          "Confidence",
          "Location",
        ],
        rows: input.inspections.map((inspection) => [
          inspection.created_at,
          inspection.meat_type,
          inspection.classification,
          `${inspection.confidence_score}%`,
          inspection.location ?? "-",
        ]),
      }),
    ],
  };
}
