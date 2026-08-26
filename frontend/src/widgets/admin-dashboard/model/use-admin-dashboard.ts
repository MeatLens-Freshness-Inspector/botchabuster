import { useEffect, useMemo, useState } from "react";
import { format, subDays, isAfter } from "date-fns";
import { toast } from "sonner";
import { accessCodeClient, type AccessCode } from "@/entities/access-code";
import type { AuditLogEntry } from "@/entities/audit-log";
import { developerDashboardClient } from "@/entities/developer-metrics";
import { inspectionClient } from "@/entities/inspection";
import { marketLocationClient, type MarketLocation } from "@/entities/market-location";
import { profileClient, type Profile } from "@/entities/user/api";
import { DEFAULT_MARKET_LOCATIONS } from "@/entities/market-location";
import { useAccessCodeForm, useAccessCodes } from "@/features/admin-management";
import { useMarketForm, useMarketLocations } from "@/features/admin-management";
import { composeReportPdf } from "@/features/reports";
import type { Inspection } from "@/entities/inspection";
import {
  ADMIN_DASHBOARD_CHART_CONFIG,
  ADMIN_DASHBOARD_MOBILE_CATEGORY_AXIS_PROPS,
  ADMIN_DASHBOARD_MOBILE_TIME_AXIS_PROPS,
  PIE_COLORS,
  buildAdminDashboardReportPdfModel,
  toCsvValue,
} from "../lib/dashboard";
import { useDashboardSession } from "./use-dashboard-session";
import { useInspectionsTab } from "./use-inspections-tab";
import { useLogFilters } from "./use-log-filters";
import { useLogsTab } from "./use-logs-tab";
import { useOverviewTab } from "./use-overview-tab";
import { useUserActions } from "./use-user-actions";
import { useUsersTab } from "./use-users-tab";
import { useDashboardAnalytics } from "./use-dashboard-analytics";
import { useDashboardReport } from "./use-dashboard-report";
import { useExportTask } from "@/shared/lib/use-export-task";

export function useAdminDashboard() {
  const {
    activeTab,
    isDeveloper,
    isMobile,
    profile,
    setActiveTab,
    tabs,
    user,
  } = useDashboardSession();
  const {
    developerLatestRuns,
    setDeveloperLatestRuns,
    setStats,
    stats,
  } = useOverviewTab();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [marketLocations, setMarketLocations] = useState<MarketLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [pendingDeleteInspectionId, setPendingDeleteInspectionId] = useState<string | null>(null);
  const reportExport = useExportTask<"pdf" | "csv" | "json">();
  const accessCodeForm = useAccessCodeForm({ setAccessCodes });
  const accessCodesState = useAccessCodes({ setAccessCodes });
  const marketForm = useMarketForm({ marketLocations, setMarketLocations });
  const marketLocationsState = useMarketLocations({ marketLocations, setMarketLocations });
  const usersTab = useUsersTab(profiles);
  const userActions = useUserActions({
    currentUserId: user?.id,
    setProfiles,
    setStats,
    setUserPage: usersTab.setUserPage,
  });
  const logsTab = useLogsTab();
  const logFilters = useLogFilters(logsTab.auditLogs);
  const { loadAuditLogs } = logsTab;
  const analytics = useDashboardAnalytics(inspections, profiles);
  const reportState = useDashboardReport({
    developerLatestRuns,
    inspections,
    isDeveloper,
    profileById: analytics.profileById,
  });

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileData, inspectionData, statsData, codesData, marketsData, developerOverview] = await Promise.all([
        profileClient.getAllProfiles(),
        inspectionClient.getAll(200, 0, "all"),
        profileClient.getUserStats(),
        accessCodeClient.getAll(),
        marketLocationClient.getAll(),
        isDeveloper
          ? developerDashboardClient.getOverview().catch((error) => {
              console.error("Failed to load developer report model runs:", error);
              return null;
            })
          : Promise.resolve(null),
      ]);
      setProfiles(profileData);
      setInspections(inspectionData);
      setStats(statsData);
      setAccessCodes(codesData);
      setMarketLocations([...marketsData].sort((left, right) => left.name.localeCompare(right.name)));
      setDeveloperLatestRuns(developerOverview?.latestRuns ?? []);
    } catch (err) {
      console.error("Failed to load admin data:", err);
      const message = err instanceof Error && err.message ? err.message : "Failed to load admin data";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "logs") return;
    void loadAuditLogs();
  }, [activeTab, loadAuditLogs]);

  const {
    classificationCounts,
    profileById,
    dailyInspections,
    inspectorAnalytics,
    meatTypeAnalytics,
    locationAnalytics,
    confidenceTrendData,
    freshnessMixData,
  } = analytics;

  const {
    filteredInspections,
    inspectionPage,
    inspectionPageSize,
    inspectorFilter,
    paginatedInspections,
    setInspectionPage,
    setInspectorFilter,
    totalInspectionPages,
  } = useInspectionsTab(inspections, profileById);

  const pieData = ["fresh", "not fresh", "acceptable", "warning", "spoiled"].map((classification) => ({
    name: classification.charAt(0).toUpperCase() + classification.slice(1),
    value: classificationCounts[classification] || 0,
    fill: PIE_COLORS[classification as keyof typeof PIE_COLORS],
  }));

  const {
    filteredProfiles,
    paginatedProfiles,
    totalUserPages,
    userPage,
    userPageSize,
    userSearchQuery,
    setUserPage,
    setUserPageSize,
    setUserSearchQuery,
  } = usersTab;

  const {
    reportDateRangeInvalid,
    reportEndDate,
    reportStartDate,
    reportClassCounts,
    reportRows,
    reportSummary,
    reportTopInspectors,
    reportByMeatType,
    reportTopLocations,
    reportDailyTrend,
    reportClassShare,
    reportDeveloperMetrics,
    getReportFileSuffix,
    validateReportRange,
  } = reportState;

  const avgConfidence = useMemo(() => {
    if (inspections.length === 0) return 0;
    return Math.round(inspections.reduce((s, i) => s + i.confidence_score, 0) / inspections.length);
  }, [inspections]);

  const spoiledRate = useMemo(() => {
    if (inspections.length === 0) return 0;
    return Math.round(((classificationCounts["spoiled"] || 0) / inspections.length) * 100);
  }, [classificationCounts, inspections.length]);

  const recentTrend = useMemo(() => {
    const last7 = inspections.filter((i) => isAfter(new Date(i.created_at), subDays(new Date(), 7))).length;
    const prev7 = inspections.filter((i) => {
      const d = new Date(i.created_at);
      return isAfter(d, subDays(new Date(), 14)) && !isAfter(d, subDays(new Date(), 7));
    }).length;
    if (prev7 === 0) return last7 > 0 ? 100 : 0;
    return Math.round(((last7 - prev7) / prev7) * 100);
  }, [inspections]);

  const chartConfig = ADMIN_DASHBOARD_CHART_CONFIG;
  const mobileCategoryAxisProps = ADMIN_DASHBOARD_MOBILE_CATEGORY_AXIS_PROPS;
  const mobileTimeAxisProps = ADMIN_DASHBOARD_MOBILE_TIME_AXIS_PROPS;

  const handleDeleteInspection = async (id: string) => {
    setPendingDeleteInspectionId(id);
  };

  const confirmDeleteInspection = async () => {
    const id = pendingDeleteInspectionId;
    if (!id) return;
    setPendingDeleteInspectionId(null);

    try {
      await inspectionClient.delete(id);
      setInspections((prev) => prev.filter((i) => i.id !== id));
      toast.success("Inspection deleted");
    } catch {
      toast.error("Failed to delete inspection");
    }
  };

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      anchor.remove();
    }, 1000);
  };

  const handleExportCSV = async () => {
    if (!validateReportRange()) return;

    await reportExport.run("csv", (report) => {
      report({ current: 1, total: 2 });
      const headers = [
      "ID",
      "Created At",
      "Captured At",
      "Inspector",
      "Inspector Email",
      "Inspector Code",
      "Location",
      "Manual Location",
      "Latitude",
      "Longitude",
      "Profile Location",
      "Meat Type",
      "Classification",
      ...(isDeveloper ? ["Manual Classification"] : []),
      "Confidence",
      "Decision Source",
      "Protocol Spoiled Reason",
      "Stall Number",
      "Certificate Proof",
      "Meat Expiry Date",
      "Storage Correct",
      "Light Color Correct",
      "Light Color Observed",
      "Area Clean",
      "Regulatory Compliance",
      "Flagged Deviations",
      "Explanation",
      "Inspector Notes",
      "Image URL",
    ];
      const rows = reportRows.map((row) => [
      row.id,
      formatReportDateTime(row.createdAt),
      formatReportDateTime(row.capturedAt),
      row.inspector,
      row.inspectorEmail,
      row.inspectorCode,
      row.location,
      row.manualLocation,
      row.locationLatitude,
      row.locationLongitude,
      row.profileLocation,
      row.meatType,
      row.classification,
      ...(isDeveloper ? [row.manualClassification] : []),
      row.confidenceScore,
      row.decisionSource,
      row.protocolSpoiledReason,
      row.stallNumber,
      row.certificateProof,
      row.meatExpiryDate,
      row.storageCorrect,
      row.lightColorCorrect,
      row.lightColorObserved,
      row.areaClean,
      row.regulatoryCompliance,
      row.flaggedDeviations,
      row.explanation,
      row.inspectorNotes,
      row.imageUrl,
    ]);
      const developerRows = isDeveloper && reportDeveloperMetrics
      ? [
          [],
          ["Developer Analytics"],
          ["Metric", "Value"],
          ["In-App Model Accuracy", reportDeveloperMetrics.inAppAccuracy],
          ["In-App Precision", reportDeveloperMetrics.inAppPrecision],
          ["In-App Recall", reportDeveloperMetrics.inAppRecall],
          ["In-App F1-Score", reportDeveloperMetrics.inAppF1Score],
          ["Correctly Identified", reportDeveloperMetrics.correctlyIdentified],
          ["Incorrectly Identified", reportDeveloperMetrics.incorrectlyIdentified],
          [],
          ["Class", "Model Identified", "Actual", "TP", "FP", "FN", "TN", "Accuracy", "Precision", "Recall", "F1 Score"],
          ...reportDeveloperMetrics.classBreakdown.map((item) => [
            item.class,
            item.modelIdentifiedCount,
            item.actualCount,
            item.tp,
            item.fp,
            item.fn,
            item.tn,
            item.accuracy,
            item.precision,
            item.recall,
            item.f1Score,
          ]),
          [],
          ["Meat Type", "Total", "Correct", "Accuracy"],
          ...reportDeveloperMetrics.meatTypeBreakdown.map((item) => [item.meatType, item.totalCount, item.correctCount, item.accuracy]),
          [],
          ["Imported Model", "Accuracy", "Precision", "Recall", "F1 Score"],
          ...developerLatestRuns.map((run) => [run.name, run.accuracy, run.precision, run.recall, run.f1Score]),
        ]
      : [];
      const csv = [headers, ...rows, ...developerRows]
        .map((record) => record.map((value) => toCsvValue(value)).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      report({ current: 2, total: 2 });
      triggerDownload(blob, `MeatLens-report-detail-${getReportFileSuffix()}.csv`);
      toast.success("CSV detail report exported");
    });
  };

  const handleExportJSON = async () => {
    if (!validateReportRange()) return;

    await reportExport.run("json", (report) => {
      report({ current: 1, total: 2 });
      const reportExportInspections = isDeveloper
      ? reportRows
      : reportRows.map(({ manualClassification: _manualClassification, ...row }) => row);
      const payload = {
      generatedAt: new Date().toISOString(),
      generatedBy: user?.email ?? user?.id ?? "admin",
      dateRange: {
        start: reportStartDate,
        end: reportEndDate,
      },
      summary: {
        totalInspections: reportSummary.total,
        averageConfidence: reportSummary.averageConfidence,
        spoiledRate: reportSummary.spoiledRate,
        uniqueInspectors: reportSummary.uniqueInspectors,
        uniqueLocations: reportSummary.uniqueLocations,
        recordsWithDeviations: reportSummary.flaggedRecords,
        classificationBreakdown: reportClassCounts,
        classificationShare: reportClassShare,
      },
      topInspectors: reportTopInspectors,
      topLocations: reportTopLocations,
      meatTypeBreakdown: reportByMeatType,
      dailyTrend: reportDailyTrend,
      inspections: reportExportInspections,
      ...(isDeveloper && reportDeveloperMetrics
        ? {
            developerAnalytics: {
              liveMetrics: reportDeveloperMetrics,
              importedModelRuns: developerLatestRuns,
              charts: {
                classComparison: reportDeveloperMetrics.classBreakdown,
                meatTypeAccuracy: reportDeveloperMetrics.meatTypeBreakdown,
                modelComparison: [
                  ...developerLatestRuns,
                  {
                    name: "In-App Model (Live Dataset)",
                    accuracy: reportDeveloperMetrics.inAppAccuracy,
                    precision: reportDeveloperMetrics.inAppPrecision,
                    recall: reportDeveloperMetrics.inAppRecall,
                    f1Score: reportDeveloperMetrics.inAppF1Score,
                  },
                ],
              },
            },
          }
        : {}),
    };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
      report({ current: 2, total: 2 });
      triggerDownload(blob, `MeatLens-report-snapshot-${getReportFileSuffix()}.json`);
      toast.success("JSON snapshot report exported");
    });
  };

  const handleExportPDF = async () => {
    if (!validateReportRange()) return;

    await reportExport.run("pdf", async (report) => {
      report({ current: 1, total: 3 });
      try {
      const generatedAt = format(new Date(), "MMM d, yyyy h:mm a");
      const generatedBy = user?.email ?? user?.id ?? "admin";
      const model = buildAdminDashboardReportPdfModel({
        reportOrganization: profile?.report_organization ?? null,
        reportStartDate,
        reportEndDate,
        generatedAt,
        generatedBy,
        reportSummary,
        reportRows,
        isDeveloper,
        developerLatestRuns,
        allLocations:
          marketLocations.length > 0
            ? marketLocations.map((m) => m.name)
            : [...DEFAULT_MARKET_LOCATIONS],
      });

      report({ current: 2, total: 3 });
      await composeReportPdf(
        model,
        `MeatLens-report-summary-${getReportFileSuffix()}.pdf`,
      );
      report({ current: 3, total: 3 });
      toast.success("PDF summary exported");
      } catch (error) {
        console.error("Failed to export admin PDF report", error);
        toast.error("Failed to export admin PDF report");
      }
    });
  };

  const activeTabConfig =
    tabs.find((tab) => tab.key === activeTab) ??
    tabs[0];
  const handleRefresh = () => {
    if (activeTab === "logs") {
      void loadAuditLogs();
      return;
    }

    void loadData();
  };

  return {
    user,
    isMobile,
    isDeveloper,
    tabs,
    chartConfig,
    mobileCategoryAxisProps,
    mobileTimeAxisProps,
    profiles,
    inspections,
    accessCodes,
    marketLocations,
    stats,
    loading,
    ...usersTab,
    ...userActions,
    ...accessCodeForm,
    ...accessCodesState,
    ...logsTab,
    ...logFilters,
    ...marketForm,
    ...marketLocationsState,
    ...reportState,
    activeReportExport: reportExport.activeTask,
    activeReportExportProgress: reportExport.progress,
    activeTab,
    activeTabConfig,
    previewImageUrl,
    pendingDeleteInspectionId,
    inspectorFilter,
    classificationCounts,
    profileById,
    pieData,
    dailyInspections,
    inspectorAnalytics,
    meatTypeAnalytics,
    locationAnalytics,
    confidenceTrendData,
    freshnessMixData,
    filteredInspections,
    paginatedInspections,
    inspectionPage,
    inspectionPageSize,
    totalInspectionPages,
    setInspectionPage,
    reportDateRangeInvalid,
    reportClassCounts,
    reportRows,
    reportSummary,
    reportTopInspectors,
    reportByMeatType,
    reportTopLocations,
    reportDailyTrend,
    reportClassShare,
    avgConfidence,
    spoiledRate,
    recentTrend,
    setActiveTab,
    setPreviewImageUrl,
    setPendingDeleteInspectionId,
    setInspectorFilter,
    loadData,
    handleRefresh,
    handleDeleteInspection,
    confirmDeleteInspection,
    handleExportCSV,
    handleExportJSON,
    handleExportPDF,
  };
}

export type AdminDashboardPageViewModel = ReturnType<
  typeof useAdminDashboard
>;
