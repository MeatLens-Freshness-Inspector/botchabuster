import { toast } from "sonner";

interface UseReportsTabOptions {
  reportDateRangeInvalid: boolean;
  reportEndDate: string;
  reportRows: readonly unknown[];
  reportStartDate: string;
}

export function useReportsTab({
  reportDateRangeInvalid,
  reportEndDate,
  reportRows,
  reportStartDate,
}: UseReportsTabOptions) {
  const getReportFileSuffix = () => `${reportStartDate}_to_${reportEndDate}`;
  const validateReportRange = () => {
    if (reportDateRangeInvalid) {
      toast.error("Report date range is invalid");
      return false;
    }
    if (reportRows.length === 0) {
      toast.error("No inspections found for the selected report range");
      return false;
    }
    return true;
  };

  return { getReportFileSuffix, validateReportRange };
}
