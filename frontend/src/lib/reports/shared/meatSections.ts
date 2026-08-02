import type {
  ReportMetric,
  ReportSection,
  ReportTable,
} from "@/lib/reports/types";

export function buildSharedMeatSummarySection(input: {
  totalInspections: number;
  averageConfidence: number;
  spoiledRateLabel?: string;
}): ReportSection {
  const metrics: ReportMetric[] = [
    { label: "Total Inspections", value: String(input.totalInspections) },
    { label: "Average Confidence", value: `${input.averageConfidence}%` },
  ];

  if (input.spoiledRateLabel) {
    metrics.push({
      label: "Spoiled Rate",
      value: input.spoiledRateLabel,
      emphasis: "warning",
    });
  }

  return {
    id: "meat-summary",
    title: "Meat Inspection Summary",
    metrics,
  };
}

export function buildSharedMeatDetailSection(
  table: ReportTable,
): ReportSection {
  return {
    id: "meat-detail",
    title: "Meat Inspection Detail",
    tables: [table],
  };
}
