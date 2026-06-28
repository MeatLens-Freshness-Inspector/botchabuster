import {
  Bug,
  ClipboardList,
  FileBarChart2,
  KeyRound,
  LayoutGrid,
  MapPin,
  ScrollText,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import type { Profile } from "@/integrations/api/ProfileClient";
import type { FreshnessClassification } from "@/types/inspection";
import type { AdminDashboardTabKey } from "../types";

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
  { key: "codes", label: "Access Codes", icon: KeyRound },
  { key: "markets", label: "Markets", icon: MapPin },
  { key: "reports", label: "Reports", icon: FileBarChart2 },
  { key: "logs", label: "Logs", icon: ScrollText },
  { key: "developer", label: "Developer Options", icon: Bug },
];

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

export const normalizeMarketName = (value: string) =>
  value.trim().replace(/\s+/g, " ");

export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const toCsvValue = (value: unknown): string => {
  const raw = value == null ? "" : String(value);
  if (raw.includes(",") || raw.includes("\n") || raw.includes('"')) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
};

export const getOptionalText = (
  value: string | null | undefined,
): string => value?.trim() || "-";

export const formatReportDateTime = (
  value: string | null | undefined,
): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : format(date, "yyyy-MM-dd HH:mm:ss");
};

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
