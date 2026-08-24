import type { ReportOrganization } from "@/features/reports/model/types";
import { getEffectiveInspectionClassification, type FreshnessClassification } from "@/entities/inspection";
import { formatDateTime as formatReportDateTime } from "@/shared/lib/date-time";
import { getTemplateKeyForOrganization } from "@/features/reports/lib/pdf/assets";
import {
  buildSharedMeatSummarySection,
} from "@/features/reports/lib/meat-sections";
import type { ReportChart, ReportDocumentModel, ReportSection } from "@/features/reports/model/types";

// commit 14: chart builders for inspector daily report
// -------------------------------------------------------

type InspectorDailyInspection = {
  id: string;
  created_at: string;
  captured_at: string | null;
  meat_type: string;
  classification: FreshnessClassification;
  official_classification?: FreshnessClassification | null;
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

const INSPECTOR_CLASSIFICATION_ORDER = [
  "fresh",
  "not fresh",
  "acceptable",
  "warning",
  "spoiled",
] as const;

const INSPECTOR_CLASSIFICATION_COLORS: Record<string, string> = {
  fresh: "hsl(142, 71%, 45%)",
  "not fresh": "hsl(38, 92%, 50%)",
  acceptable: "hsl(48, 96%, 53%)",
  warning: "hsl(25, 95%, 53%)",
  spoiled: "hsl(0, 84%, 60%)",
};

function buildInspectorClassificationChart(
  inspections: InspectorDailyInspection[],
): ReportChart {
  const counts = new Map<string, number>();

  inspections.forEach((inspection) => {
    counts.set(
      getEffectiveInspectionClassification(inspection),
      (counts.get(getEffectiveInspectionClassification(inspection)) ?? 0) + 1,
    );
  });

  return {
    id: "classification-breakdown",
    title: "Classification Breakdown",
    kind: "bar",
    emptyState: "No inspections for this day",
    points: INSPECTOR_CLASSIFICATION_ORDER.filter(
      (classification) => (counts.get(classification) ?? 0) > 0,
    ).map((classification) => ({
      label: classification,
      value: counts.get(classification) ?? 0,
      color: INSPECTOR_CLASSIFICATION_COLORS[classification],
    })),
  };
}

function buildInspectorMeatTypeChart(
  inspections: InspectorDailyInspection[],
): ReportChart {
  const counts = new Map<string, number>();

  inspections.forEach((inspection) => {
    counts.set(
      inspection.meat_type,
      (counts.get(inspection.meat_type) ?? 0) + 1,
    );
  });

  return {
    id: "meat-type-breakdown",
    title: "Meat Type Breakdown",
    kind: "bar",
    emptyState: "No inspections for this day",
    points: Array.from(counts.entries())
      .sort(
        (left, right) =>
          right[1] - left[1] || left[0].localeCompare(right[0]),
      )
      .map(([label, value]) => ({ label, value })),
  };
}

function buildInspectorConfidenceByHourChart(
  inspections: InspectorDailyInspection[],
): ReportChart {
  const buckets = new Map<string, { total: number; count: number }>();

  inspections.forEach((inspection) => {
    // Use the UTC hour from the ISO timestamp (chars 11–12) so the grouping
    // is deterministic regardless of the runtime's local timezone.
    const hour = inspection.created_at.slice(11, 13) + ":00";
    const current = buckets.get(hour) ?? { total: 0, count: 0 };
    current.total += inspection.confidence_score;
    current.count += 1;
    buckets.set(hour, current);
  });

  return {
    id: "confidence-by-hour",
    title: "Confidence by Hour",
    kind: "line",
    emptyState: "No inspections for this day",
    points: Array.from(buckets.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([label, { total, count }]) => ({
        label,
        value: Math.round(total / count),
      })),
  };
}

// commit 15: insert report-graphs section into the inspector daily model
// -----------------------------------------------------------------------

export function buildInspectorDailyReportModel(
  input: BuildInspectorDailyReportInput,
): ReportDocumentModel {
  const graphSection: ReportSection = {
    id: "report-graphs",
    title: "Report Graphs",
    charts: [
      buildInspectorClassificationChart(input.inspections),
      buildInspectorMeatTypeChart(input.inspections),
      buildInspectorConfidenceByHourChart(input.inspections),
    ],
  };

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
      graphSection,
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
          classification: getEffectiveInspectionClassification(inspection),
          confidenceLabel: `${inspection.confidence_score}%`,
          location: inspection.location ?? "-",
        })),
      },
    ],
  };
}

