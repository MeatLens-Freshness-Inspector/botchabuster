import type { ReportOrganization } from "@/lib/reportOrganizations";
import { formatReportDateTime } from "@/lib/reports/formatting";
import { getTemplateKeyForOrganization } from "@/lib/reports/pdf/assets";
import {
  buildSharedMeatSummarySection,
} from "@/lib/reports/shared/meatSections";
import type { ReportDocumentModel } from "@/lib/reports/types";

type InspectorDailyInspection = {
  id: string;
  created_at: string;
  captured_at: string | null;
  meat_type: string;
  classification: string;
  confidence_score: number;
  location: string | null;
  image_url: string | null;
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
      {
        id: "meat-detail",
        title: "Daily Inspection Evidence",
        inspectionEvidence: input.inspections.map((inspection) => ({
          id: inspection.id,
          imageUrl: inspection.image_url,
          capturedAt: formatReportDateTime(
            inspection.captured_at ?? inspection.created_at,
          ),
          meatType: inspection.meat_type,
          classification: inspection.classification,
          confidenceLabel: `${inspection.confidence_score}%`,
          location: inspection.location ?? "-",
        })),
      },
    ],
  };
}
