import { useCallback, useMemo, useState } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useInspections } from "@/hooks/useInspections";
import type { FreshnessClassification, Inspection } from "@/types/inspection";
import type { FilterOption, HistoryMonthlyCount } from "../types";
import {
  buildDetailedHistoryReportHtml,
  buildHistorySearchText,
  triggerDownload,
} from "../utils/historyPage";

const PAGE_SIZE = 6;

export function useHistoryPage() {
  const { profile } = useAuth();
  const { data: inspections, isLoading } = useInspections();
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReportDay, setSelectedReportDay] = useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  const totalInspections = inspections?.length ?? 0;
  const reportDayDate = useMemo(
    () => new Date(`${selectedReportDay}T00:00:00`),
    [selectedReportDay],
  );
  const hasValidReportDay = !Number.isNaN(reportDayDate.getTime());

  const selectedDayRange = useMemo(() => {
    if (!hasValidReportDay) return null;

    return {
      start: startOfDay(reportDayDate),
      end: endOfDay(reportDayDate),
    };
  }, [hasValidReportDay, reportDayDate]);

  const avgConfidence = useMemo(() => {
    if (!inspections?.length) return 0;

    return Math.round(
      inspections.reduce((sum, item) => sum + item.confidence_score, 0) / inspections.length,
    );
  }, [inspections]);

  const classificationCounts = useMemo(() => {
    const counts: Record<FreshnessClassification, number> = {
      fresh: 0,
      "not fresh": 0,
      acceptable: 0,
      warning: 0,
      spoiled: 0,
    };

    (inspections ?? []).forEach((item) => {
      counts[item.classification] += 1;
    });

    return counts;
  }, [inspections]);

  const freshRate = useMemo(() => {
    if (!totalInspections) return 0;
    return Math.round((classificationCounts.fresh / totalInspections) * 100);
  }, [classificationCounts.fresh, totalInspections]);

  const spoiledRate = useMemo(() => {
    if (!totalInspections) return 0;
    return Math.round((classificationCounts.spoiled / totalInspections) * 100);
  }, [classificationCounts.spoiled, totalInspections]);

  const filteredInspections = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return (inspections ?? []).filter((inspection) => {
      if (selectedDayRange) {
        const createdAt = new Date(inspection.created_at);
        if (createdAt < selectedDayRange.start || createdAt > selectedDayRange.end) {
          return false;
        }
      }

      if (activeFilter !== "all" && inspection.classification !== activeFilter) {
        return false;
      }

      if (!query) return true;
      return buildHistorySearchText(inspection).includes(query);
    });
  }, [activeFilter, inspections, searchText, selectedDayRange]);

  const selectedDayInspections = useMemo(() => {
    if (!selectedDayRange) return [];

    return (inspections ?? []).filter((inspection) => {
      const createdAt = new Date(inspection.created_at);
      return createdAt >= selectedDayRange.start && createdAt <= selectedDayRange.end;
    });
  }, [inspections, selectedDayRange]);

  const totalPages = Math.max(1, Math.ceil(filteredInspections.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedInspections = useMemo(
    () => filteredInspections.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredInspections, safePage],
  );

  const monthlyCounts = useMemo<HistoryMonthlyCount[]>(() => {
    const monthMap = new Map<string, number>();

    (inspections ?? []).forEach((item) => {
      const monthKey = format(new Date(item.created_at), "MMMM yyyy");
      monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + 1);
    });

    return Array.from(monthMap.entries())
      .map(([label, count]) => ({ label, count }))
      .slice(0, 6);
  }, [inspections]);

  const selectedDayAverageConfidence = useMemo(() => {
    if (selectedDayInspections.length === 0) return 0;

    return Math.round(
      selectedDayInspections.reduce(
        (total, inspection) => total + inspection.confidence_score,
        0,
      ) / selectedDayInspections.length,
    );
  }, [selectedDayInspections]);

  const formattedReportDayLabel = hasValidReportDay
    ? format(reportDayDate, "MMMM d, yyyy")
    : null;

  const updateSearchText = useCallback((value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  }, []);

  const updateReportDay = useCallback((value: string) => {
    setSelectedReportDay(value);
    setCurrentPage(1);
  }, []);

  const updateActiveFilter = useCallback((value: FilterOption) => {
    setActiveFilter(value);
    setCurrentPage(1);
  }, []);

  const selectInspection = useCallback((inspection: Inspection) => {
    setSelectedInspection(inspection);
  }, []);

  const handleExportDetailedPdf = useCallback(() => {
    if (!hasValidReportDay) {
      toast.error("Please choose a valid inspection day");
      return;
    }

    if (selectedDayInspections.length === 0) {
      toast.error("No inspections found for the selected day");
      return;
    }

    const generatedAt = format(new Date(), "MMM d, yyyy h:mm a");
    const reportBlob = new Blob(
      [
        buildDetailedHistoryReportHtml({
          averageConfidence: selectedDayAverageConfidence,
          generatedAt,
          inspections: selectedDayInspections,
          selectedReportDay,
          reportOrganization: profile?.report_organization ?? null,
        }),
      ],
      { type: "text/html;charset=utf-8" },
    );
    const reportUrl = URL.createObjectURL(reportBlob);
    const reportWindow = window.open(reportUrl, "_blank");

    if (!reportWindow) {
      URL.revokeObjectURL(reportUrl);
      triggerDownload(reportBlob, `MeatLens-inspector-detailed-${selectedReportDay}.html`);
      toast.success("Report downloaded. Open it and choose Print to save as PDF.");
      return;
    }

    const cleanup = () => URL.revokeObjectURL(reportUrl);
    reportWindow.addEventListener("afterprint", cleanup, { once: true });
    reportWindow.addEventListener(
      "load",
      () => {
        reportWindow.focus();
        reportWindow.print();
      },
      { once: true },
    );
    window.setTimeout(cleanup, 60_000);

    toast.success("Detailed report opened. Save as PDF in the print dialog.");
  }, [
    hasValidReportDay,
    profile?.report_organization,
    selectedDayAverageConfidence,
    selectedDayInspections,
    selectedReportDay,
  ]);

  return {
    isLoading,
    activeFilter,
    searchText,
    selectedReportDay,
    selectedInspection,
    totalInspections,
    avgConfidence,
    freshRate,
    spoiledRate,
    filteredInspections,
    hasValidReportDay,
    formattedReportDayLabel,
    selectedDayInspections,
    selectedDayAverageConfidence,
    pagedInspections,
    totalPages,
    safePage,
    classificationCounts,
    monthlyCounts,
    setCurrentPage,
    updateSearchText,
    updateReportDay,
    updateActiveFilter,
    selectInspection,
    setSelectedInspection,
    handleExportDetailedPdf,
  };
}
