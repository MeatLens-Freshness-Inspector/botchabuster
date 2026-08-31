import { useMemo } from "react";
import { format } from "date-fns";
import {
  formatInspectionLocationLabel,
  getEffectiveInspectionClassification,
  getMeatTypeScopeLabel,
  type Inspection,
  type FreshnessClassification,
} from "@/entities/inspection";
import type { Profile } from "@/entities/user/api";
import { useModelAccuracyHistory, type ModelAccuracySnapshot } from "@/entities/model-accuracy";
import { buildDeveloperInAppMetrics } from "@/features/developer-tools";
import { useAdminReport, useReportsTab } from "@/features/reports";
import type { DeveloperOverviewMetricPoint } from "@/entities/developer-metrics";
import type { ReportDailyTrendRow, ReportLocationBreakdown, ReportRow } from "./types";
import {
  REPORT_CLASSIFICATIONS,
  buildPreScanReportFields,
  getInspectorLabel,
  getLocationLabel,
  getOptionalText,
} from "../lib/dashboard";

type DashboardReportOptions = {
  developerLatestRuns: DeveloperOverviewMetricPoint[];
  inspections: Inspection[];
  isDeveloper: boolean;
  profileById: Map<string, Profile>;
};

export function useDashboardReport({
  developerLatestRuns,
  inspections,
  isDeveloper,
  profileById,
}: DashboardReportOptions) {
  const adminReport = useAdminReport(inspections);
  const {
    reportDateRangeInvalid,
    reportEndDate,
    reportFilteredInspections,
    reportStartDate,
  } = adminReport;
  const { data: loadedModelAccuracyHistory } = useModelAccuracyHistory(reportStartDate, reportEndDate);
  const modelAccuracyHistory: ModelAccuracySnapshot[] = loadedModelAccuracyHistory ?? [];

  const reportClassCounts = useMemo(() => {
    const counts: Record<FreshnessClassification, number> = {
      fresh: 0,
      "not fresh": 0,
      acceptable: 0,
      warning: 0,
      spoiled: 0,
    };

    reportFilteredInspections.forEach((inspection) => {
      counts[getEffectiveInspectionClassification(inspection)] += 1;
    });

    return counts;
  }, [reportFilteredInspections]);

  const reportRows = useMemo<ReportRow[]>(() => {
    return reportFilteredInspections.map((inspection) => {
      const profile = inspection.user_id ? profileById.get(inspection.user_id) : undefined;
      const manualLocation = getLocationLabel(inspection.location, profile);
      const locationLabel =
        formatInspectionLocationLabel(
          manualLocation,
          inspection.location_latitude,
          inspection.location_longitude,
        ) || manualLocation;

      return {
        id: inspection.id,
        createdAt: inspection.created_at,
        capturedAt: inspection.captured_at ?? null,
        inspector: getInspectorLabel(profile),
        inspectorEmail: getOptionalText(profile?.email),
        inspectorCode: getOptionalText(profile?.inspector_code),
        manualLocation,
        location: locationLabel,
        locationLatitude: inspection.location_latitude,
        locationLongitude: inspection.location_longitude,
        profileLocation: getOptionalText(profile?.location),
        meatType: inspection.meat_type,
        meatTypeScopeLabel: getMeatTypeScopeLabel(inspection.meat_type),
        classification: getEffectiveInspectionClassification(inspection),
        manualClassification: inspection.manual_classification,
        confidenceScore: inspection.confidence_score,
        ...buildPreScanReportFields(inspection),
        flaggedDeviations: inspection.flagged_deviations.length > 0 ? inspection.flagged_deviations.join("; ") : "-",
        explanation: getOptionalText(inspection.explanation),
        inspectorNotes: getOptionalText(inspection.inspector_notes),
        imageUrl: inspection.image_url ?? null,
      };
    });
  }, [profileById, reportFilteredInspections]);

  const reportSummary = useMemo(() => {
    if (reportRows.length === 0) {
      return {
        total: 0,
        averageConfidence: 0,
        spoiledRate: 0,
        uniqueInspectors: 0,
        uniqueLocations: 0,
        flaggedRecords: 0,
      };
    }

    const total = reportRows.length;
    const averageConfidence = Math.round(
      reportRows.reduce((sum, row) => sum + row.confidenceScore, 0) / total,
    );
    const spoiledCount = reportRows.filter((row) => row.classification === "spoiled").length;
    return {
      total,
      averageConfidence,
      spoiledRate: Math.round((spoiledCount / total) * 100),
      uniqueInspectors: new Set(reportRows.map((row) => row.inspector)).size,
      uniqueLocations: new Set(reportRows.map((row) => row.manualLocation)).size,
      flaggedRecords: reportRows.filter((row) => row.flaggedDeviations !== "-").length,
    };
  }, [reportRows]);

  const reportTopInspectors = useMemo(() => {
    const aggregates = new Map<string, { count: number; totalConfidence: number }>();
    reportRows.forEach((row) => {
      const current = aggregates.get(row.inspector) ?? { count: 0, totalConfidence: 0 };
      current.count += 1;
      current.totalConfidence += row.confidenceScore;
      aggregates.set(row.inspector, current);
    });

    return Array.from(aggregates.entries())
      .map(([inspector, value]) => ({
        inspector,
        count: value.count,
        averageConfidence: Math.round(value.totalConfidence / value.count),
      }))
      .sort((left, right) => right.count - left.count || right.averageConfidence - left.averageConfidence || left.inspector.localeCompare(right.inspector))
      .slice(0, 8);
  }, [reportRows]);

  const reportByMeatType = useMemo(() => {
    const aggregates = new Map<string, number>();
    reportRows.forEach((row) => {
      aggregates.set(row.meatType, (aggregates.get(row.meatType) ?? 0) + 1);
    });
    return Array.from(aggregates.entries())
      .map(([meatType, count]) => ({ meatType, count }))
      .sort((left, right) => right.count - left.count || left.meatType.localeCompare(right.meatType));
  }, [reportRows]);

  const reportTopLocations = useMemo<ReportLocationBreakdown[]>(() => {
    const aggregates = new Map<string, { count: number; spoiledCount: number; totalConfidence: number }>();
    reportRows.forEach((row) => {
      const current = aggregates.get(row.manualLocation) ?? { count: 0, spoiledCount: 0, totalConfidence: 0 };
      current.count += 1;
      current.totalConfidence += row.confidenceScore;
      if (row.classification === "spoiled") current.spoiledCount += 1;
      aggregates.set(row.manualLocation, current);
    });
    return Array.from(aggregates.entries())
      .map(([location, entry]) => ({
        location,
        count: entry.count,
        spoiledCount: entry.spoiledCount,
        spoiledRate: Math.round((entry.spoiledCount / entry.count) * 100),
        averageConfidence: Math.round(entry.totalConfidence / entry.count),
      }))
      .sort((left, right) => right.count - left.count || right.spoiledRate - left.spoiledRate || left.location.localeCompare(right.location))
      .slice(0, 10);
  }, [reportRows]);

  const reportDailyTrend = useMemo<ReportDailyTrendRow[]>(() => {
    const aggregates = new Map<string, { count: number; spoiledCount: number; totalConfidence: number }>();
    reportRows.forEach((row) => {
      const key = format(new Date(row.createdAt), "yyyy-MM-dd");
      const current = aggregates.get(key) ?? { count: 0, spoiledCount: 0, totalConfidence: 0 };
      current.count += 1;
      current.totalConfidence += row.confidenceScore;
      if (row.classification === "spoiled") current.spoiledCount += 1;
      aggregates.set(key, current);
    });
    return Array.from(aggregates.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([date, entry]) => ({
        date,
        count: entry.count,
        spoiledCount: entry.spoiledCount,
        averageConfidence: Math.round(entry.totalConfidence / entry.count),
      }));
  }, [reportRows]);

  const reportClassShare = useMemo(
    () => REPORT_CLASSIFICATIONS.map((classification) => {
      const count = reportClassCounts[classification];
      return {
        classification,
        count,
        share: reportSummary.total > 0 ? Math.round((count / reportSummary.total) * 100) : 0,
      };
    }),
    [reportClassCounts, reportSummary.total],
  );

  const reportDeveloperMetrics = useMemo(
    () => isDeveloper
      ? buildDeveloperInAppMetrics(reportFilteredInspections.map((inspection) => ({
          classification: inspection.classification,
          manual_classification: inspection.manual_classification,
          meat_type: inspection.meat_type,
        })))
      : null,
    [isDeveloper, reportFilteredInspections],
  );

  const reportsTab = useReportsTab({
    reportDateRangeInvalid,
    reportEndDate,
    reportRows,
    reportStartDate,
  });

  return {
    ...adminReport,
    ...reportsTab,
    reportClassCounts,
    reportRows,
    reportSummary,
    reportTopInspectors,
    reportByMeatType,
    reportTopLocations,
    reportDailyTrend,
    reportClassShare,
    reportDeveloperMetrics,
    modelAccuracyHistory,
  };
}
