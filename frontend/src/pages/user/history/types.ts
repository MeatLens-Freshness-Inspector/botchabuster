import type { ReportOrganization } from "@/lib/reportOrganizations";
import type { FreshnessClassification, Inspection } from "@/types/inspection";

export type FilterOption = "all" | FreshnessClassification;

export type HistoryFilterOption = {
  key: FilterOption;
  label: string;
};

export type HistoryMonthlyCount = {
  label: string;
  count: number;
};

export type DetailedHistoryReportInput = {
  averageConfidence: number;
  generatedAt: string;
  inspections: Inspection[];
  selectedReportDay: string;
  reportOrganization: ReportOrganization | null | undefined;
};
