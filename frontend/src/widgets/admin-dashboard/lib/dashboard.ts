import {
  Bug,
  ClipboardList,
  FileBarChart2,
  KeyRound,
  LayoutGrid,
  MapPin,
  Scale,
  ScrollText,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import type { Profile } from "@/entities/user/api/profile-client";
import { formatInspectorNameForExport, resolveReportOrganization } from "@/features/reports";
import { formatDateTime as formatReportDateTime } from "@/shared/lib/date-time";
import { buildAdminRangeReportModel } from "@/features/reports";
import type { ModelAccuracySnapshot } from "@/entities/model-accuracy";
import type { DeveloperOverviewMetricPoint } from "@/entities/developer-metrics";
import type { ReportDocumentModel } from "@/features/reports/model/types";
import type { FreshnessClassification, Inspection } from "@/entities/inspection";
import type { AdminDashboardTabKey, ReportRow } from "../model/types";
import { normalizeMarketName as normalizeEntityMarketName } from "@/entities/market-location";

export const CLASS_COLORS: Record<FreshnessClassification, string> = {
  fresh: "bg-fresh",
  "not fresh": "bg-warning",
  acceptable: "bg-acceptable",
  warning: "bg-warning",
  spoiled: "bg-spoiled",
};

export const PIE_COLORS: Record<FreshnessClassification, string> = {
  fresh: "hsl(142, 71%, 45%)",
  "not fresh": "hsl(38, 92%, 50%)",
  acceptable: "hsl(48, 96%, 53%)",
  warning: "hsl(25, 95%, 53%)",
  spoiled: "hsl(0, 84%, 60%)",
};

export const MEAT_TYPE_LABELS = {
  beef: "Beef",
  pork: "Pork",
  chicken: "Chicken",
  fish: "Fish",
  other: "Other",
} as const;

export const ANALYTICS_DAYS = 14;
export const MAX_ANALYTICS_ITEMS = 6;
export const REPORT_DEFAULT_RANGE_DAYS = 30;
export const REPORT_PDF_DETAIL_ROW_LIMIT = 60;
export const REGULATORY_COMPLIANCE_AVAILABLE_FROM = "2026-08-05";
export const UNKNOWN_INSPECTOR_LABEL = "Unknown Inspector";
export const UNSPECIFIED_LOCATION_LABEL = "Unspecified";
export const REPORT_CLASSIFICATIONS: FreshnessClassification[] = [
  "fresh",
  "not fresh",
  "acceptable",
  "warning",
  "spoiled",
];

export const ADMIN_DASHBOARD_TABS: Array<{
  key: AdminDashboardTabKey;
  label: string;
  icon: typeof LayoutGrid;
}> = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "users", label: "Users", icon: Users },
  { key: "inspections", label: "Inspections", icon: ClipboardList },
  { key: "disputes", label: "Disputes", icon: Scale },
  { key: "codes", label: "Access Codes", icon: KeyRound },
  { key: "markets", label: "Markets", icon: MapPin },
  { key: "reports", label: "Reports", icon: FileBarChart2 },
  { key: "logs", label: "Logs", icon: ScrollText },
];

export function getAdminDashboardTabs(isDeveloper: boolean): Array<{
  key: AdminDashboardTabKey;
  label: string;
  icon: typeof LayoutGrid;
}> {
  return isDeveloper
    ? [...ADMIN_DASHBOARD_TABS, { key: "developer", label: "Developer Settings", icon: Bug }]
    : ADMIN_DASHBOARD_TABS;
}

export function coerceAdminDashboardTab(
  activeTab: AdminDashboardTabKey,
  isDeveloper: boolean,
): AdminDashboardTabKey {
  return activeTab === "developer" && !isDeveloper ? "overview" : activeTab;
}

export const ADMIN_DASHBOARD_CHART_CONFIG = {
  count: { label: "Inspections", color: "hsl(var(--primary))" },
  fresh: { label: "Fresh", color: PIE_COLORS.fresh },
  notFresh: { label: "Not Fresh", color: PIE_COLORS["not fresh"] },
  acceptable: { label: "Acceptable", color: PIE_COLORS.acceptable },
  warning: { label: "Warning", color: PIE_COLORS.warning },
  spoiled: { label: "Spoiled", color: PIE_COLORS.spoiled },
  confidence: { label: "Avg Confidence", color: "hsl(var(--warning))" },
  spoiledRate: { label: "Spoiled Rate", color: PIE_COLORS.spoiled },
  value: { label: "Count", color: "hsl(var(--primary))" },
};

export const truncateChartLabel = (value: string) =>
  value.length > 12 ? `${value.slice(0, 12)}...` : value;

export const ADMIN_DASHBOARD_MOBILE_CATEGORY_AXIS_PROPS = {
  tick: { fontSize: 10 },
  tickFormatter: truncateChartLabel,
  interval: 0 as const,
  angle: -24,
  textAnchor: "end" as const,
  height: 52,
  className: "fill-muted-foreground",
};

export const ADMIN_DASHBOARD_MOBILE_TIME_AXIS_PROPS = {
  tick: { fontSize: 10 },
  minTickGap: 20,
  tickMargin: 6,
  className: "fill-muted-foreground",
};

export const getInspectorLabel = (profile?: Profile) =>
  profile?.full_name?.trim() ||
  profile?.email?.trim() ||
  profile?.inspector_code?.trim() ||
  UNKNOWN_INSPECTOR_LABEL;

export const getLocationLabel = (
  inspectionLocation: string | null,
  profile?: Profile,
) =>
  inspectionLocation?.trim() ||
  profile?.location?.trim() ||
  UNSPECIFIED_LOCATION_LABEL;

export const normalizeMarketName = normalizeEntityMarketName;

export const toCsvValue = (value: unknown): string => {
  const raw = value == null ? "" : String(value);
  if (raw.includes(",") || raw.includes("\n") || raw.includes('"')) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
};

export function formatReportRowForExport(row: ReportRow): ReportRow {
  return { ...row, inspector: formatInspectorNameForExport(row.inspector) };
}

export function formatTopInspectorForExport<T extends { inspector: string }>(entry: T): T {
  return { ...entry, inspector: formatInspectorNameForExport(entry.inspector) };
}

export const getOptionalText = (
  value: string | null | undefined,
): string => value?.trim() || "-";

const formatYesNo = (value: boolean | null | undefined): string =>
  value == null ? "-" : value ? "Yes" : "No";

export const resolveRegulatoryComplianceStatus = (
  inspection: Pick<
    Inspection,
    | "regulatory_compliance"
    | "storage_correct"
    | "light_color_correct"
    | "area_clean"
  >,
): boolean | null => {
  if (inspection.regulatory_compliance !== undefined && inspection.regulatory_compliance !== null) {
    return inspection.regulatory_compliance;
  }
  const hasPreScan =
    inspection.storage_correct != null ||
    inspection.light_color_correct != null ||
    inspection.area_clean != null;
  if (!hasPreScan) return null;
  return (
    inspection.storage_correct === true &&
    inspection.light_color_correct === true &&
    inspection.area_clean === true
  );
};

export const formatRegulatoryComplianceLabel = (
  compliance: boolean | null | undefined,
): string => {
  if (compliance === true) return "Compliant";
  if (compliance === false) return "Non-Compliant";
  return "Not Recorded";
};

const formatRegulatoryComplianceLabelForInspection = (
  createdAt: string,
  compliance: boolean | null,
): string => {
  if (createdAt.slice(0, 10) < REGULATORY_COMPLIANCE_AVAILABLE_FROM) {
    return "Not available";
  }
  return formatRegulatoryComplianceLabel(compliance);
};

export const formatRegulatoryComplianceReasonForInspection = (
  createdAt: string,
  compliance: boolean | null | undefined,
  storageCorrect: boolean | null | undefined,
  lightColorCorrect: boolean | null | undefined,
  areaClean: boolean | null | undefined,
): string => {
  if (createdAt.slice(0, 10) < REGULATORY_COMPLIANCE_AVAILABLE_FROM) {
    return "Regulatory compliance was not available for this record.";
  }
  if (compliance === true) return "All pre-scan safety checks passed.";
  if (compliance === null || compliance === undefined) {
    return "No pre-scan safety checks were recorded.";
  }

  const failedChecks = [
    storageCorrect !== true ? "Storage Correct" : null,
    lightColorCorrect !== true ? "Light Color Correct" : null,
    areaClean !== true ? "Area Clean" : null,
  ].filter((value): value is string => value !== null);

  return failedChecks.length > 0
    ? `Failed checks: ${failedChecks.join(", ")}.`
    : "The pre-scan checks did not all pass.";
};

export const buildPreScanReportFields = (
  inspection: Pick<
    Inspection,
    | "created_at"
    | "stall_number"
    | "meat_inspection_certificate_proof"
    | "meat_expiry_date"
    | "storage_correct"
    | "light_color_correct"
    | "light_color_observed"
    | "area_clean"
    | "inspection_decision_source"
    | "protocol_spoiled_reason"
    | "regulatory_compliance"
  >,
) => ({
  stallNumber: getOptionalText(inspection.stall_number),
  certificateProof: getOptionalText(inspection.meat_inspection_certificate_proof),
  meatExpiryDate: getOptionalText(inspection.meat_expiry_date),
  storageCorrect: formatYesNo(inspection.storage_correct),
  lightColorCorrect: formatYesNo(inspection.light_color_correct),
  lightColorObserved: getOptionalText(inspection.light_color_observed),
  areaClean: formatYesNo(inspection.area_clean),
  regulatoryCompliance: formatRegulatoryComplianceLabelForInspection(
    inspection.created_at,
    resolveRegulatoryComplianceStatus(inspection),
  ),
  regulatoryComplianceReason: formatRegulatoryComplianceReasonForInspection(
    inspection.created_at,
    resolveRegulatoryComplianceStatus(inspection),
    inspection.storage_correct,
    inspection.light_color_correct,
    inspection.area_clean,
  ),
  decisionSource:
    inspection.inspection_decision_source === "protocol_pre_scan"
      ? "Pre-scan protocol"
      : inspection.inspection_decision_source === "ai"
        ? "AI analysis"
        : "-",
  protocolSpoiledReason: getOptionalText(inspection.protocol_spoiled_reason),
});

export function buildAdminDashboardReportPdfModel(input: {
  reportOrganization: unknown;
  reportStartDate: string;
  reportEndDate: string;
  generatedAt: string;
  generatedBy: string;
  reportSummary: {
    total: number;
    averageConfidence: number;
    spoiledRate: number;
    uniqueInspectors: number;
    uniqueLocations: number;
    flaggedRecords: number;
  };
  reportRows: ReportRow[];
  allLocations?: string[];
  isDeveloper?: boolean;
  developerLatestRuns?: DeveloperOverviewMetricPoint[];
  modelAccuracyHistory?: ModelAccuracySnapshot[];
}): ReportDocumentModel {
  return buildAdminRangeReportModel({
    reportOrganization: resolveReportOrganization(input.reportOrganization),
    reportStartDate: input.reportStartDate,
    reportEndDate: input.reportEndDate,
    generatedAt: input.generatedAt,
    generatedBy: input.generatedBy,
    summary: input.reportSummary,
    allLocations: input.allLocations,
    isDeveloper: input.isDeveloper,
    developerLatestRuns: input.developerLatestRuns?.map((run) => ({
      name: `${run.modelFamily} (${run.modelVersion})`,
      accuracy: run.accuracy,
      precision: run.precision,
      recall: run.recall,
      f1Score: run.f1Score,
    })),
    reportRows: input.reportRows.map((row) => ({
      createdAt: formatReportDateTime(row.createdAt),
      capturedAt: row.capturedAt ? formatReportDateTime(row.capturedAt) : null,
      inspector: row.inspector,
      location: row.location,
      meatType: row.meatType,
      meatTypeScopeLabel: row.meatTypeScopeLabel,
      classification: row.classification,
      manualClassification: row.manualClassification,
      confidenceScore: row.confidenceScore,
      regulatoryCompliance: row.regulatoryCompliance,
      regulatoryComplianceReason: row.regulatoryComplianceReason,
      imageUrl: row.imageUrl,
    })),
    modelAccuracyHistory: input.modelAccuracyHistory,
  });
}

export const parsePayloadText = (
  payload: Record<string, unknown>,
  key: string,
): string => {
  const value = payload[key];
  return typeof value === "string" ? value : "";
};

export const parsePayloadActor = (
  payload: Record<string, unknown>,
): { id: string; role: string } => {
  const actor = payload.actor;
  if (!actor || typeof actor !== "object" || Array.isArray(actor)) {
    return { id: "-", role: "-" };
  }

  const actorRecord = actor as Record<string, unknown>;
  const id =
    typeof actorRecord.id === "string" && actorRecord.id.trim()
      ? actorRecord.id
      : "-";
  const role =
    typeof actorRecord.role === "string" && actorRecord.role.trim()
      ? actorRecord.role
      : "-";

  return { id, role };
};

export const parsePayloadSource = (
  payload: Record<string, unknown>,
): { ip: string; userAgent: string } => {
  const source = payload.source;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return { ip: "-", userAgent: "-" };
  }

  const sourceRecord = source as Record<string, unknown>;
  const ip =
    typeof sourceRecord.ip === "string" && sourceRecord.ip.trim()
      ? sourceRecord.ip
      : "-";
  const userAgent =
    typeof sourceRecord.user_agent === "string" &&
    sourceRecord.user_agent.trim()
      ? sourceRecord.user_agent
      : "-";

  return { ip, userAgent };
};
