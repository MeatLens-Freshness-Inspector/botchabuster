import { useMemo, useState } from "react";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import type { Inspection } from "@/entities/inspection";

const DEFAULT_REPORT_RANGE_DAYS = 30;

export function useAdminReport(inspections: Inspection[]) {
  const [reportStartDate, setReportStartDate] = useState(() => format(subDays(new Date(), DEFAULT_REPORT_RANGE_DAYS - 1), "yyyy-MM-dd"));
  const [reportEndDate, setReportEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const reportDateRangeInvalid = reportStartDate > reportEndDate;
  const reportFilteredInspections = useMemo(() => {
    if (reportDateRangeInvalid) return [];
    const startDate = startOfDay(new Date(`${reportStartDate}T00:00:00`));
    const endDate = endOfDay(new Date(`${reportEndDate}T00:00:00`));
    return inspections.filter((inspection) => {
      const inspectionDate = new Date(inspection.created_at);
      return inspectionDate >= startDate && inspectionDate <= endDate;
    });
  }, [inspections, reportDateRangeInvalid, reportEndDate, reportStartDate]);

  return {
    reportDateRangeInvalid,
    reportEndDate,
    reportFilteredInspections,
    reportStartDate,
    setReportEndDate,
    setReportStartDate,
  };
}
