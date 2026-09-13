import { endOfDay, format, isValid, startOfDay } from "date-fns";
import type {
  Inspection,
  InspectionResultDispute,
  InspectionResultDisputeStatus,
} from "@/entities/inspection";

const DISPUTE_STATUSES: InspectionResultDisputeStatus[] = ["pending", "approved", "rejected"];

export type DisputeStatusCount = {
  status: InspectionResultDisputeStatus;
  count: number;
};

export type DisputeDailyTrend = {
  date: string;
  count: number;
};

export type DisputeAnalyticsSummary = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  disputeRate: number;
};

export type DisputeAnalytics = {
  summary: DisputeAnalyticsSummary;
  statusDistribution: DisputeStatusCount[];
  dailyTrend: DisputeDailyTrend[];
  filteredDisputes: InspectionResultDispute[];
};

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return isValid(date) ? date : null;
}

function getDateBounds(startDate?: string, endDate?: string): { start: Date | null; end: Date | null; invalid: boolean } {
  const start = startDate ? startOfDay(new Date(`${startDate}T00:00:00`)) : null;
  const end = endDate ? endOfDay(new Date(`${endDate}T00:00:00`)) : null;
  const invalid = Boolean(
    (startDate && (!start || !isValid(start)))
    || (endDate && (!end || !isValid(end)))
    || (start && end && start > end),
  );

  return { start, end, invalid };
}

function isWithinBounds(value: string, start: Date | null, end: Date | null): boolean {
  const date = parseDate(value);
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

export function filterDisputesByDateRange(
  disputes: InspectionResultDispute[],
  startDate?: string,
  endDate?: string,
): InspectionResultDispute[] {
  const bounds = getDateBounds(startDate, endDate);
  if (bounds.invalid) return [];

  return disputes
    .filter((dispute) => {
      if (!bounds.start && !bounds.end) return true;
      return isWithinBounds(dispute.created_at, bounds.start, bounds.end);
    })
    .map((dispute, index) => ({ dispute, index, date: parseDate(dispute.created_at) }))
    .sort((left, right) => {
      if (!left.date && !right.date) return left.index - right.index;
      if (!left.date) return 1;
      if (!right.date) return -1;
      return right.date.getTime() - left.date.getTime() || right.dispute.id.localeCompare(left.dispute.id);
    })
    .map(({ dispute }) => dispute);
}

function filterInspectionsByDateRange(
  inspections: Inspection[],
  startDate?: string,
  endDate?: string,
): Inspection[] {
  const bounds = getDateBounds(startDate, endDate);
  if (bounds.invalid) return [];
  if (!bounds.start && !bounds.end) return inspections;
  return inspections.filter((inspection) => isWithinBounds(inspection.created_at, bounds.start, bounds.end));
}

export function buildDisputeAnalytics(input: {
  disputes: InspectionResultDispute[];
  inspections: Inspection[];
  startDate?: string;
  endDate?: string;
}): DisputeAnalytics {
  const filteredDisputes = filterDisputesByDateRange(input.disputes, input.startDate, input.endDate);
  const scopedInspections = filterInspectionsByDateRange(input.inspections, input.startDate, input.endDate);
  const counts = Object.fromEntries(DISPUTE_STATUSES.map((status) => [status, 0])) as Record<InspectionResultDisputeStatus, number>;

  filteredDisputes.forEach((dispute) => {
    if (dispute.status in counts) counts[dispute.status] += 1;
  });

  const disputedInspectionIds = new Set(
    filteredDisputes
      .map((dispute) => dispute.inspection_id.trim())
      .filter((inspectionId) => inspectionId.length > 0),
  );
  const dailyCounts = new Map<string, number>();
  filteredDisputes.forEach((dispute) => {
    const date = parseDate(dispute.created_at);
    if (!date) return;
    const key = format(date, "yyyy-MM-dd");
    dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
  });

  return {
    summary: {
      total: filteredDisputes.length,
      pending: counts.pending,
      approved: counts.approved,
      rejected: counts.rejected,
      disputeRate: scopedInspections.length > 0
        ? Math.round((disputedInspectionIds.size / scopedInspections.length) * 100)
        : 0,
    },
    statusDistribution: DISPUTE_STATUSES.map((status) => ({ status, count: counts[status] })),
    dailyTrend: Array.from(dailyCounts.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, count]) => ({ date, count })),
    filteredDisputes,
  };
}
