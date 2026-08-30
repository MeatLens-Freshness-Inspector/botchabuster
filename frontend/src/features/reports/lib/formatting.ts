import { formatDateTime } from "@/shared/lib/date-time";

export function formatReportDateTime(value: string | null | undefined): string {
  return formatDateTime(value);
}

export function formatReportPercentage(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(2)}%`;
}

export function formatInspectorNameForExport(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed.includes("@")) return trimmed;

  const parts = trimmed.split(/\s+/);
  if (parts.length < 2 || parts[0].toUpperCase() === "UNKNOWN") return trimmed;

  return `${parts[0].charAt(0).toUpperCase()}. ${parts.slice(1).join(" ")}`;
}
