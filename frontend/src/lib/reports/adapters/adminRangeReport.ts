import { DEFAULT_MARKET_LOCATIONS } from "@/lib/marketLocations";
import type { ReportOrganization } from "@/lib/reportOrganizations";
import { formatDateTime as formatReportDateTime } from "@/shared/lib/date-time";
import { getTemplateKeyForOrganization } from "@/lib/reports/pdf/assets";
import {
  buildSharedMeatDetailSection,
  buildSharedMeatSummarySection,
} from "@/features/reports/lib/meat-sections";
import type {
  ReportChart,
  ReportDocumentModel,
  ReportInspectionEvidenceItem,
  ReportSection,
} from "@/features/reports/model/types";
import { buildDeveloperInAppMetrics, type DeveloperMetricRecord } from "@/pages/admin-dashboard/utils/developerInAppMetrics";

type AdminSummary = {
  total: number;
  averageConfidence: number;
  spoiledRate: number;
  uniqueInspectors: number;
  uniqueLocations: number;
  flaggedRecords: number;
};

type AdminReportRow = {
  createdAt: string;
  capturedAt: string | null;
  inspector: string;
  location: string;
  meatType: string;
  classification: string;
  manualClassification?: string;
  confidenceScore: number;
  imageUrl: string | null;
};

type DeveloperReportRun = {
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
};

const CLASSIFICATION_ORDER = [
  "fresh",
  "not fresh",
  "acceptable",
  "warning",
  "spoiled",
] as const;

const CLASSIFICATION_COLORS: Record<string, string> = {
  fresh: "hsl(142, 71%, 45%)",
  "not fresh": "hsl(38, 92%, 50%)",
  acceptable: "hsl(48, 96%, 53%)",
  warning: "hsl(25, 95%, 53%)",
  spoiled: "hsl(0, 84%, 60%)",
};

export interface BuildAdminRangeReportInput {
  reportOrganization: ReportOrganization;
  reportStartDate: string;
  reportEndDate: string;
  generatedAt: string;
  generatedBy: string;
  summary: AdminSummary;
  reportRows: AdminReportRow[];
  allLocations?: string[];
  isDeveloper?: boolean;
  developerLatestRuns?: DeveloperReportRun[];
}

const formatMetricPercent = (value: number): string => `${Math.round(value * 1000) / 10}%`;

function buildDeveloperReportRows(reportRows: AdminReportRow[]): DeveloperMetricRecord[] {
  return reportRows.map((row) => ({
    classification: row.classification as DeveloperMetricRecord["classification"],
    manual_classification: row.manualClassification as DeveloperMetricRecord["manual_classification"],
    meat_type: row.meatType,
  }));
}

function buildDeveloperSections(
  reportRows: AdminReportRow[],
  latestRuns: DeveloperReportRun[],
): ReportSection[] {
  const metrics = buildDeveloperInAppMetrics(buildDeveloperReportRows(reportRows));
  const classCountRows = metrics.classBreakdown.map((item) => [
    item.class,
    String(item.modelIdentifiedCount),
    String(item.actualCount),
    String(item.tp),
    String(item.fp),
    String(item.fn),
    String(item.tn),
  ]);
  const classMetricRows = metrics.classBreakdown.map((item) => [
    item.class,
    formatMetricPercent(item.accuracy),
    formatMetricPercent(item.precision),
    formatMetricPercent(item.recall),
    formatMetricPercent(item.f1Score),
  ]);
  const meatRows = metrics.meatTypeBreakdown.map((item) => [
    item.meatType,
    String(item.totalCount),
    String(item.correctCount),
    formatMetricPercent(item.accuracy),
  ]);
  const runRows = latestRuns.map((run) => [
    run.name,
    formatMetricPercent(run.accuracy),
    formatMetricPercent(run.precision),
    formatMetricPercent(run.recall),
    formatMetricPercent(run.f1Score),
  ]);
  const activeClasses = metrics.classBreakdown.filter((item) => item.actualCount > 0 || item.modelIdentifiedCount > 0);

  return [
    {
      id: "developer-metrics",
      title: "Developer Model Metrics",
      metrics: [
        { label: "In-App Model Accuracy", value: formatMetricPercent(metrics.inAppAccuracy) },
        { label: "In-App Precision", value: formatMetricPercent(metrics.inAppPrecision) },
        { label: "In-App Recall", value: formatMetricPercent(metrics.inAppRecall) },
        { label: "In-App F1-Score", value: formatMetricPercent(metrics.inAppF1Score) },
        { label: "Correctly Identified", value: `${metrics.correctlyIdentified} of ${metrics.totalEvaluated}` },
        { label: "Incorrectly Identified", value: String(metrics.incorrectlyIdentified) },
      ],
      tables: latestRuns.length > 0 ? [{
        title: "Imported Model Runs",
        columns: ["Model", "Accuracy", "Precision", "Recall", "F1 Score"],
        rows: runRows,
      }] : [],
    },
    {
      id: "developer-class-performance",
      title: "In-App Model Class Performance",
      tables: [{
        title: "Class Confusion Counts",
        columns: ["Class", "Model Identified", "Actual", "TP", "FP", "FN", "TN"],
        rows: classCountRows,
      }, {
        title: "Class Metrics",
        columns: ["Class", "Accuracy", "Precision", "Recall", "F1 Score"],
        rows: classMetricRows,
      }, {
        title: "Meat Type Accuracy",
        columns: ["Meat Type", "Total", "Correct", "Accuracy"],
        rows: meatRows,
      }],
    },
    {
      id: "developer-graphs",
      title: "Developer Analytics Graphs",
      charts: [
        {
          id: "developer-class-comparison",
          title: "Model Identified vs Actual Ground Truth",
          kind: "bar",
          points: [],
          series: [
            { name: "Model Identified", color: "#3b82f6", points: activeClasses.map((item) => ({ label: item.class, value: item.modelIdentifiedCount })) },
            { name: "Actual (Ground Truth)", color: "#22c55e", points: activeClasses.map((item) => ({ label: item.class, value: item.actualCount })) },
            { name: "Correctly Identified (TP)", color: "#eab308", points: activeClasses.map((item) => ({ label: item.class, value: item.tp })) },
          ],
          emptyState: "No inspection dataset records available",
        },
        {
          id: "developer-model-comparison",
          title: "Developer Model Comparison",
          kind: "bar",
          orientation: "horizontal",
          points: [],
          series: [
            { name: "Accuracy", color: "#2563eb", points: [...latestRuns.map((run) => ({ label: run.name, value: run.accuracy * 100 })), { label: "In-App Live", value: metrics.inAppAccuracy * 100 }] },
            { name: "Precision", color: "#22c55e", points: [...latestRuns.map((run) => ({ label: run.name, value: run.precision * 100 })), { label: "In-App Live", value: metrics.inAppPrecision * 100 }] },
            { name: "Recall", color: "#eab308", points: [...latestRuns.map((run) => ({ label: run.name, value: run.recall * 100 })), { label: "In-App Live", value: metrics.inAppRecall * 100 }] },
            { name: "F1 Score", color: "#ef4444", points: [...latestRuns.map((run) => ({ label: run.name, value: run.f1Score * 100 })), { label: "In-App Live", value: metrics.inAppF1Score * 100 }] },
          ],
          emptyState: "No model comparison metrics available",
        },
      ],
    },
  ];
}

function buildClassificationChart(reportRows: AdminReportRow[]): ReportChart {
  const counts = new Map<string, number>();

  reportRows.forEach((row) => {
    counts.set(row.classification, (counts.get(row.classification) ?? 0) + 1);
  });

  return {
    id: "classification-breakdown",
    title: "Classification Breakdown",
    kind: "bar",
    emptyState: "No data for selected range",
    points: CLASSIFICATION_ORDER
      .filter((classification) => (counts.get(classification) ?? 0) > 0)
      .map((classification) => ({
        label: classification,
        value: counts.get(classification) ?? 0,
        color: CLASSIFICATION_COLORS[classification],
      })),
  };
}

function buildDailyTrendChart(reportRows: AdminReportRow[]): ReportChart {
  const counts = new Map<string, number>();

  reportRows.forEach((row) => {
    const date = row.createdAt.slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  });

  return {
    id: "daily-inspection-trend",
    title: "Daily Inspection Trend",
    kind: "line",
    emptyState: "No data for selected range",
    points: Array.from(counts.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([label, value]) => ({ label, value })),
  };
}

function buildLocationTrendChart(
  reportRows: AdminReportRow[],
  allLocations?: string[],
): ReportChart {
  const counts = new Map<string, number>();

  const locationsList =
    allLocations && allLocations.length > 0
      ? allLocations
      : DEFAULT_MARKET_LOCATIONS;

  locationsList.forEach((loc) => {
    const cleanLoc = loc.trim();
    if (cleanLoc) counts.set(cleanLoc, 0);
  });

  reportRows.forEach((row) => {
    const rawLocation = row.location?.trim() || "";
    const locationName = rawLocation ? rawLocation.split("|")[0].trim() : "Unspecified";
    counts.set(locationName, (counts.get(locationName) ?? 0) + 1);
  });

  return {
    id: "location-breakdown",
    title: "Location Breakdown",
    kind: "bar",
    rotateLabels: true,
    emptyState: "No data for selected range",
    points: Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([label, value]) => ({ label, value })),
  };
}

function buildPorkInspectionEvidence(
  reportRows: AdminReportRow[],
): ReportInspectionEvidenceItem[] {
  return reportRows
    .filter((row) => row.meatType === "pork" && !!row.imageUrl)
    .sort((left, right) =>
      (right.capturedAt ?? right.createdAt).localeCompare(left.capturedAt ?? left.createdAt),
    )
    .map((row, index) => ({
      id: `pork-evidence-${index + 1}`,
      imageUrl: row.imageUrl,
      capturedAt: formatReportDateTime(row.capturedAt ?? row.createdAt),
      meatType: row.meatType,
      classification: row.classification,
      confidenceLabel: `${row.confidenceScore}%`,
      location: row.location,
      inspectorLabel: row.inspector,
    }));
}

export function buildAdminRangeReportModel(
  input: BuildAdminRangeReportInput,
): ReportDocumentModel {
  const overview: ReportSection = {
    id: "org-overview",
    title: "Organization Overview",
    metrics: [
      { label: "Total Inspections", value: String(input.summary.total) },
      {
        label: "Average Confidence",
        value: `${input.summary.averageConfidence}%`,
      },
      {
        label: "Spoiled Rate",
        value: `${input.summary.spoiledRate}%`,
        emphasis: "warning",
      },
      {
        label: "Unique Inspectors",
        value: String(input.summary.uniqueInspectors),
      },
      {
        label: "Unique Locations",
        value: String(input.summary.uniqueLocations),
      },
      {
        label: "Records With Deviations",
        value: String(input.summary.flaggedRecords),
      },
    ],
    detailRows: [{ label: "Generated By", value: input.generatedBy }],
  };

  const graphSection: ReportSection = {
    id: "report-graphs",
    title: "Report Graphs",
    charts: [
      buildClassificationChart(input.reportRows),
      buildDailyTrendChart(input.reportRows),
      buildLocationTrendChart(input.reportRows, input.allLocations),
    ],
  };

  const porkInspectionEvidence = buildPorkInspectionEvidence(input.reportRows);
  const developerSections = input.isDeveloper
    ? buildDeveloperSections(input.reportRows, input.developerLatestRuns ?? [])
    : [];

  return {
    organization: input.reportOrganization,
    templateKey: getTemplateKeyForOrganization(input.reportOrganization),
    kind: "admin_range",
    title: "Administrative Report",
    subtitle: `Range: ${input.reportStartDate} to ${input.reportEndDate}`,
    generatedAt: input.generatedAt,
    sections: [
      overview,
      ...developerSections,
      buildSharedMeatSummarySection({
        totalInspections: input.summary.total,
        averageConfidence: input.summary.averageConfidence,
        spoiledRateLabel: `${input.summary.spoiledRate}%`,
      }),
      graphSection,
      ...(porkInspectionEvidence.length > 0
        ? [
            {
              id: "pork-gallery",
              title: "Pork Inspection Evidence",
              inspectionEvidence: porkInspectionEvidence,
              evidenceLayout: "photo-first" as const,
            } satisfies ReportSection,
          ]
        : []),
      buildSharedMeatDetailSection({
        title: "Inspection Detail",
        columns: [
          "Created",
          "Inspector",
          "Location",
          "Meat",
          "Classification",
          "Confidence",
        ],
        rows: input.reportRows.map((row) => [
          row.createdAt,
          row.inspector,
          row.location,
          row.meatType,
          row.classification,
          `${row.confidenceScore}%`,
        ]),
      }),
    ],
  };
}
