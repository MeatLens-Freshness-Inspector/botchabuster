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
