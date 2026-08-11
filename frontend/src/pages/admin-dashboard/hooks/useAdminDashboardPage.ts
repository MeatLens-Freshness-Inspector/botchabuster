import { useEffect, useMemo, useState } from "react";
import { format, subDays, startOfDay, endOfDay, isAfter } from "date-fns";
import { toast } from "sonner";
import { accessCodeClient, type AccessCode } from "@/entities/access-code";
import { auditLogClient, type AuditLogEntry } from "@/entities/audit-log";
import { developerDashboardClient } from "@/entities/developer-metrics";
import { inspectionClient } from "@/entities/inspection";
import { marketLocationClient, type MarketLocation } from "@/entities/market-location";
import { profileClient, type Profile } from "@/entities/user/api";
import { formatInspectionLocationLabel } from "@/entities/inspection";
import { DEFAULT_MARKET_LOCATIONS } from "@/entities/market-location";
import {
  getReportOrganizationLabel,
  isReportOrganization,
} from "@/features/reports";
import { formatDateTime as formatReportDateTime } from "@/shared/lib/date-time";
import { composeReportPdf } from "@/features/reports";
import type { FreshnessClassification, Inspection } from "@/entities/inspection";
import { buildDeveloperInAppMetrics } from "@/features/developer-tools";
import type {
  ManagedUserForm,
  ReportDailyTrendRow,
  ReportLocationBreakdown,
  ReportRow,
} from "@/widgets/admin-dashboard";
import {
  ADMIN_DASHBOARD_CHART_CONFIG,
  ADMIN_DASHBOARD_MOBILE_CATEGORY_AXIS_PROPS,
  ADMIN_DASHBOARD_MOBILE_TIME_AXIS_PROPS,
  ANALYTICS_DAYS,
  MAX_ANALYTICS_ITEMS,
  MEAT_TYPE_LABELS,
  PIE_COLORS,
  REPORT_CLASSIFICATIONS,
  REPORT_DEFAULT_RANGE_DAYS,
  buildPreScanReportFields,
  buildAdminDashboardReportPdfModel,
  getInspectorLabel,
  getLocationLabel,
  getOptionalText,
  normalizeMarketName,
  parsePayloadActor,
  parsePayloadSource,
  parsePayloadText,
  toCsvValue,
  useDashboardSession,
  useOverviewTab,
} from "@/widgets/admin-dashboard";

export function useAdminDashboardPage() {
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
  const [newCode, setNewCode] = useState("");
  const [newCodeDesc, setNewCodeDesc] = useState("");
  const [newMarketName, setNewMarketName] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<string | null>(null);
  const [pendingDeleteInspectionId, setPendingDeleteInspectionId] = useState<string | null>(null);
  const [pendingDeleteCodeId, setPendingDeleteCodeId] = useState<string | null>(null);
  const [pendingDeleteMarketId, setPendingDeleteMarketId] = useState<string | null>(null);
  const [inspectorFilter, setInspectorFilter] = useState("");
  const [inspectionPage, setInspectionPage] = useState(1);
  const inspectionPageSize = 10;
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editUserForm, setEditUserForm] = useState<ManagedUserForm>({
    full_name: "",
    email: "",
    password: "",
    inspector_code: "",
    report_organization: "",
    location: "",
  });
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(5);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLogPage, setAuditLogPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(() => format(subDays(new Date(), REPORT_DEFAULT_RANGE_DAYS - 1), "yyyy-MM-dd"));
  const [reportEndDate, setReportEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [userForm, setUserForm] = useState<ManagedUserForm>({
    full_name: "",
    email: "",
    password: "",
    inspector_code: "",
    report_organization: "",
    location: "",
  });

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setInspectionPage(1);
  }, [inspectorFilter]);

  const resetUserForm = () => {
    setUserForm({
      full_name: "",
      email: "",
      password: "",
      inspector_code: "",
      report_organization: "",
      location: "",
    });
  };

  const handleStartEditUser = (profile: Profile) => {
    setEditingUserId(profile.id);
    setEditingUser(profile);
    setEditUserForm({
      full_name: profile.full_name || "",
      email: profile.email || "",
      password: "",
      inspector_code: profile.inspector_code || "",
      report_organization: profile.report_organization || "",
      location: profile.location || "",
    });
  };

  const closeEditUserModal = () => {
    setEditingUserId(null);
    setEditingUser(null);
    setEditUserForm({
      full_name: "",
      email: "",
      password: "",
      inspector_code: "",
      report_organization: "",
      location: "",
    });
  };

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

  const loadAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const logs = await auditLogClient.listRecent(200);
      setAuditLogs(logs);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      const message = err instanceof Error && err.message ? err.message : "Failed to load audit logs";
      toast.error(message);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "logs") return;
    void loadAuditLogs();
  }, [activeTab]);

  const handleSubmitUserForm = async () => {
    const email = userForm.email.trim();
    const password = userForm.password.trim();
    const reportOrganization = isReportOrganization(userForm.report_organization)
      ? userForm.report_organization
      : null;

    if (!email) {
      toast.error("Email is required");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSavingUser(true);

    try {
      const created = await profileClient.createUserByAdmin({
        email,
        password,
        full_name: userForm.full_name.trim() || null,
        inspector_code: userForm.inspector_code.trim() || null,
        report_organization: reportOrganization,
        location: userForm.location.trim() || null,
      });

      setProfiles((prev) => [created, ...prev]);
      setStats((prev) => (prev ? { ...prev, total_users: prev.total_users + 1 } : prev));
      setUserPage(1);
      toast.success("User created");
      resetUserForm();
    } catch (err) {
      console.error("Failed to create user:", err);
      const message = err instanceof Error && err.message ? err.message : "Failed to create user";
      toast.error(message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleSaveEditUser = async () => {
    if (!editingUserId) return;
    const email = editUserForm.email.trim();
    const password = editUserForm.password.trim();
    const reportOrganization = isReportOrganization(editUserForm.report_organization)
      ? editUserForm.report_organization
      : null;

    if (!email) {
      toast.error("Email is required");
      return;
    }

    if (password.length > 0 && password.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    setIsSavingUser(true);

    try {
      const updated = await profileClient.updateUserByAdmin(editingUserId, {
        email,
        full_name: editUserForm.full_name.trim() || null,
        inspector_code: editUserForm.inspector_code.trim() || null,
        report_organization: reportOrganization,
        location: editUserForm.location.trim() || null,
        ...(password ? { password } : {}),
      });

      setProfiles((prev) => prev.map((p) => (p.id === editingUserId ? updated : p)));
      toast.success("User credentials updated");
      closeEditUserModal();
    } catch (err) {
      console.error("Failed to update user:", err);
      const message = err instanceof Error && err.message ? err.message : "Failed to update user";
      toast.error(message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async (profileId: string) => {
    if (profileId === user?.id) {
      toast.error("You can't delete your own account");
      return;
    }

    setPendingDeleteUserId(profileId);
  };

  const confirmDeleteUser = async () => {
    const profileId = pendingDeleteUserId;
    if (!profileId) return;
    setPendingDeleteUserId(null);

    try {
      await profileClient.deleteUserByAdmin(profileId);
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
      setStats((prev) => (prev ? { ...prev, total_users: Math.max(0, prev.total_users - 1) } : prev));
      if (editingUserId === profileId) closeEditUserModal();
      toast.success("User deleted");
    } catch (err) {
      console.error("Failed to delete user:", err);
      toast.error("Failed to delete user");
    }
  };

  const classificationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    inspections.forEach((i) => {
      counts[i.classification] = (counts[i.classification] || 0) + 1;
    });
    return counts;
  }, [inspections]);

  const profileById = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.id, profile]));
  }, [profiles]);

  const pieData = useMemo(() => {
    return (["fresh", "not fresh", "acceptable", "warning", "spoiled"] as FreshnessClassification[]).map((c) => ({
      name: c.charAt(0).toUpperCase() + c.slice(1),
      value: classificationCounts[c] || 0,
      fill: PIE_COLORS[c],
    }));
  }, [classificationCounts]);

  const dailyAnalytics = useMemo(() => {
    const buckets = new Map<
      string,
      {
        date: string;
        count: number;
        totalConfidence: number;
        fresh: number;
        notFresh: number;
        acceptable: number;
        warning: number;
        spoiled: number;
      }
    >();
    const orderedKeys: string[] = [];

    for (let i = ANALYTICS_DAYS - 1; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const key = format(day, "yyyy-MM-dd");
      orderedKeys.push(key);
      buckets.set(key, {
        date: format(day, "MMM d"),
        count: 0,
        totalConfidence: 0,
        fresh: 0,
        notFresh: 0,
        acceptable: 0,
        warning: 0,
        spoiled: 0,
      });
    }

    inspections.forEach((inspection) => {
      const key = format(startOfDay(new Date(inspection.created_at)), "yyyy-MM-dd");
      const bucket = buckets.get(key);
      if (!bucket) return;

      bucket.count += 1;
      bucket.totalConfidence += inspection.confidence_score;

      switch (inspection.classification) {
        case "fresh":
          bucket.fresh += 1;
          break;
        case "not fresh":
          bucket.notFresh += 1;
          break;
        case "acceptable":
          bucket.acceptable += 1;
          break;
        case "warning":
          bucket.warning += 1;
          break;
        case "spoiled":
          bucket.spoiled += 1;
          break;
      }
    });

    return orderedKeys.map((key) => {
      const bucket = buckets.get(key)!;
      return {
        date: bucket.date,
        count: bucket.count,
        fresh: bucket.fresh,
        notFresh: bucket.notFresh,
        acceptable: bucket.acceptable,
        warning: bucket.warning,
        spoiled: bucket.spoiled,
        confidence: bucket.count > 0 ? Math.round(bucket.totalConfidence / bucket.count) : 0,
      };
    });
  }, [inspections]);

  const dailyInspections = useMemo(() => {
    return dailyAnalytics.map(({ date, count, fresh, spoiled }) => ({
      date,
      count,
      fresh,
      spoiled,
    }));
  }, [dailyAnalytics]);

  const inspectorAnalytics = useMemo(() => {
    const aggregates = new Map<string, { inspector: string; count: number; totalConfidence: number }>();

    inspections.forEach((inspection) => {
      const profile = inspection.user_id ? profileById.get(inspection.user_id) : undefined;
      const inspector = getInspectorLabel(profile);
      const current = aggregates.get(inspector) ?? { inspector, count: 0, totalConfidence: 0 };
      current.count += 1;
      current.totalConfidence += inspection.confidence_score;
      aggregates.set(inspector, current);
    });

    return Array.from(aggregates.values())
      .sort((left, right) => right.count - left.count || right.totalConfidence - left.totalConfidence || left.inspector.localeCompare(right.inspector))
      .slice(0, MAX_ANALYTICS_ITEMS)
      .map((entry) => ({
        inspector: entry.inspector,
        count: entry.count,
        confidence: Math.round(entry.totalConfidence / entry.count),
      }));
  }, [inspections, profileById]);

  const meatTypeAnalytics = useMemo(() => {
    const aggregates = new Map<keyof typeof MEAT_TYPE_LABELS, { count: number; spoiled: number }>();

    inspections.forEach((inspection) => {
      const key = inspection.meat_type as keyof typeof MEAT_TYPE_LABELS;
      const current = aggregates.get(key) ?? { count: 0, spoiled: 0 };
      current.count += 1;
      if (inspection.classification === "spoiled") {
        current.spoiled += 1;
      }
      aggregates.set(key, current);
    });

    return (Object.entries(MEAT_TYPE_LABELS) as Array<[keyof typeof MEAT_TYPE_LABELS, string]>)
      .map(([key, label]) => {
        const entry = aggregates.get(key) ?? { count: 0, spoiled: 0 };
        return {
          meatType: label,
          count: entry.count,
          spoiledRate: entry.count > 0 ? Math.round((entry.spoiled / entry.count) * 100) : 0,
        };
      })
      .filter((entry) => entry.count > 0)
      .sort((left, right) => right.count - left.count || left.meatType.localeCompare(right.meatType));
  }, [inspections]);

  const locationAnalytics = useMemo(() => {
    const aggregates = new Map<string, { location: string; count: number; spoiled: number }>();

    inspections.forEach((inspection) => {
      const profile = inspection.user_id ? profileById.get(inspection.user_id) : undefined;
      const location = getLocationLabel(inspection.location, profile);
      const current = aggregates.get(location) ?? { location, count: 0, spoiled: 0 };
      current.count += 1;
      if (inspection.classification === "spoiled") {
        current.spoiled += 1;
      }
      aggregates.set(location, current);
    });

    return Array.from(aggregates.values())
      .sort((left, right) => right.count - left.count || right.spoiled - left.spoiled || left.location.localeCompare(right.location))
      .slice(0, MAX_ANALYTICS_ITEMS)
      .map((entry) => ({
        location: entry.location,
        count: entry.count,
        spoiledRate: entry.count > 0 ? Math.round((entry.spoiled / entry.count) * 100) : 0,
      }));
  }, [inspections, profileById]);

  const confidenceTrendData = useMemo(() => {
    return dailyAnalytics.map(({ date, confidence }) => ({
      date,
      confidence,
    }));
  }, [dailyAnalytics]);

  const freshnessMixData = useMemo(() => {
    return dailyAnalytics.map(({ date, fresh, notFresh, acceptable, warning, spoiled }) => ({
      date,
      fresh,
      notFresh,
      acceptable,
      warning,
      spoiled,
    }));
  }, [dailyAnalytics]);

  const filteredInspections = useMemo(() => {
    const query = inspectorFilter.trim().toLowerCase();
    if (!query) return inspections;
    return inspections.filter((inspection) => {
      const profile = inspection.user_id ? profileById.get(inspection.user_id) : undefined;
      const label = getInspectorLabel(profile).toLowerCase();
      return label.includes(query);
    });
  }, [inspections, inspectorFilter, profileById]);

  const totalInspectionPages = Math.max(
    1,
    Math.ceil(filteredInspections.length / inspectionPageSize)
  );

  const paginatedInspections = useMemo(() => {
    const safePage = Math.min(Math.max(1, inspectionPage), totalInspectionPages);
    const start = (safePage - 1) * inspectionPageSize;
    return filteredInspections.slice(start, start + inspectionPageSize);
  }, [filteredInspections, inspectionPage, inspectionPageSize, totalInspectionPages]);

  const filteredProfiles = useMemo(() => {
    const query = userSearchQuery.trim().toLowerCase();
    if (!query) return profiles;
    return profiles.filter((p) => {
      const fullName = (p.full_name || "").toLowerCase();
      const email = (p.email || "").toLowerCase();
      const code = (p.inspector_code || "").toLowerCase();
      const location = (p.location || "").toLowerCase();
      const org = p.report_organization
        ? getReportOrganizationLabel(p.report_organization).toLowerCase()
        : "";
      return (
        fullName.includes(query) ||
        email.includes(query) ||
        code.includes(query) ||
        location.includes(query) ||
        org.includes(query)
      );
    });
  }, [profiles, userSearchQuery]);

  const totalUserPages = Math.max(1, Math.ceil(filteredProfiles.length / userPageSize));

  const paginatedProfiles = useMemo(() => {
    const safePage = Math.min(Math.max(1, userPage), totalUserPages);
    const start = (safePage - 1) * userPageSize;
    return filteredProfiles.slice(start, start + userPageSize);
  }, [filteredProfiles, userPage, userPageSize, totalUserPages]);

  const reportDateRangeInvalid = reportStartDate > reportEndDate;

  const reportFilteredInspections = useMemo(() => {
    if (reportDateRangeInvalid) return [];

    const startDate = startOfDay(new Date(`${reportStartDate}T00:00:00`));
    const endDate = endOfDay(new Date(`${reportEndDate}T00:00:00`));

    return inspections.filter((inspection) => {
      const inspectionDate = new Date(inspection.created_at);
      return inspectionDate >= startDate && inspectionDate <= endDate;
    });
  }, [inspections, reportDateRangeInvalid, reportStartDate, reportEndDate]);

  const reportClassCounts = useMemo(() => {
    const counts: Record<FreshnessClassification, number> = {
      fresh: 0,
      "not fresh": 0,
      acceptable: 0,
      warning: 0,
      spoiled: 0,
    };

    reportFilteredInspections.forEach((inspection) => {
      counts[inspection.classification] += 1;
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
      const preScanFields = buildPreScanReportFields(inspection);

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
        classification: inspection.classification,
        manualClassification: inspection.manual_classification,
        confidenceScore: inspection.confidence_score,
        ...preScanFields,
        flaggedDeviations: inspection.flagged_deviations.length > 0 ? inspection.flagged_deviations.join("; ") : "-",
        explanation: getOptionalText(inspection.explanation),
        inspectorNotes: getOptionalText(inspection.inspector_notes),
        imageUrl: inspection.image_url ?? null,
      };
    });
  }, [reportFilteredInspections, profileById]);

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
    const spoiledRate = Math.round((spoiledCount / total) * 100);
    const uniqueInspectors = new Set(reportRows.map((row) => row.inspector)).size;
    const uniqueLocations = new Set(reportRows.map((row) => row.manualLocation)).size;
    const flaggedRecords = reportRows.filter((row) => row.flaggedDeviations !== "-").length;

    return { total, averageConfidence, spoiledRate, uniqueInspectors, uniqueLocations, flaggedRecords };
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
      if (row.classification === "spoiled") {
        current.spoiledCount += 1;
      }
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
      if (row.classification === "spoiled") {
        current.spoiledCount += 1;
      }
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

  const reportClassShare = useMemo(() => {
    return REPORT_CLASSIFICATIONS.map((classification) => {
      const count = reportClassCounts[classification];
      return {
        classification,
        count,
        share: reportSummary.total > 0 ? Math.round((count / reportSummary.total) * 100) : 0,
      };
    });
  }, [reportClassCounts, reportSummary.total]);

  const reportDeveloperMetrics = useMemo(
    () => isDeveloper
      ? buildDeveloperInAppMetrics(reportRows.map((row) => ({
          classification: row.classification,
          manual_classification: row.manualClassification,
          meat_type: row.meatType,
        })))
      : null,
    [isDeveloper, reportRows],
  );

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

  const getReportFileSuffix = () => `${reportStartDate}_to_${reportEndDate}`;

  const validateReportRange = (): boolean => {
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

  const handleExportCSV = () => {
    if (!validateReportRange()) return;

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
    triggerDownload(blob, `MeatLens-report-detail-${getReportFileSuffix()}.csv`);
    toast.success("CSV detail report exported");
  };

  const handleExportJSON = () => {
    if (!validateReportRange()) return;

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
    triggerDownload(blob, `MeatLens-report-snapshot-${getReportFileSuffix()}.json`);
    toast.success("JSON snapshot report exported");
  };

  const handleExportPDF = async () => {
    if (!validateReportRange()) return;

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

      await composeReportPdf(
        model,
        `MeatLens-report-summary-${getReportFileSuffix()}.pdf`,
      );
      toast.success("PDF summary exported");
    } catch (error) {
      console.error("Failed to export admin PDF report", error);
      toast.error("Failed to export admin PDF report");
    }
  };

  const handleCreateCode = async () => {
    if (!newCode.trim()) {
      toast.error("Code cannot be empty");
      return;
    }
    try {
      const created = await accessCodeClient.create(newCode.trim(), newCodeDesc.trim() || undefined);
      setAccessCodes((prev) => [created, ...prev]);
      setNewCode("");
      setNewCodeDesc("");
      toast.success("Access code created");
    } catch {
      toast.error("Failed to create code");
    }
  };

  const handleDeleteCode = async (id: string) => {
    setPendingDeleteCodeId(id);
  };

  const confirmDeleteCode = async () => {
    const id = pendingDeleteCodeId;
    if (!id) return;
    setPendingDeleteCodeId(null);

    try {
      await accessCodeClient.delete(id);
      setAccessCodes((prev) => prev.filter((c) => c.id !== id));
      toast.success("Code deleted");
    } catch {
      toast.error("Failed to delete code");
    }
  };

  const handleToggleCode = async (id: string, active: boolean) => {
    try {
      await accessCodeClient.toggleActive(id, active);
      setAccessCodes((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: active } : c)));
    } catch {
      toast.error("Failed to update code");
    }
  };

  const handleCreateMarket = async () => {
    const normalizedName = normalizeMarketName(newMarketName);
    if (!normalizedName) {
      toast.error("Market name cannot be empty");
      return;
    }

    const alreadyExists = marketLocations.some(
      (market) => market.name.localeCompare(normalizedName, undefined, { sensitivity: "accent" }) === 0
    );
    if (alreadyExists) {
      toast.error("Market already exists");
      return;
    }

    try {
      const created = await marketLocationClient.create(normalizedName);
      setMarketLocations((prev) => [...prev, created].sort((left, right) => left.name.localeCompare(right.name)));
      setNewMarketName("");
      toast.success("Market added");
    } catch {
      toast.error("Failed to add market");
    }
  };

  const handleDeleteMarket = async (id: string) => {
    if (marketLocations.length <= 1) {
      toast.error("At least one market location is required");
      return;
    }

    setPendingDeleteMarketId(id);
  };

  const confirmDeleteMarket = async () => {
    const id = pendingDeleteMarketId;
    if (!id) return;
    setPendingDeleteMarketId(null);

    try {
      await marketLocationClient.delete(id);
      setMarketLocations((prev) => prev.filter((market) => market.id !== id));
      toast.success("Market removed");
    } catch {
      toast.error("Failed to remove market");
    }
  };

  const activeTabConfig =
    tabs.find((tab) => tab.key === activeTab) ??
    tabs[0];
  const auditLogsPerPage = 5;
  const paginatedAuditLogs = auditLogs.slice(
    (auditLogPage - 1) * auditLogsPerPage,
    auditLogPage * auditLogsPerPage,
  );
  const totalAuditLogPages = Math.ceil(auditLogs.length / auditLogsPerPage);

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
    activeTab,
    activeTabConfig,
    newCode,
    newCodeDesc,
    newMarketName,
    previewImageUrl,
    pendingDeleteUserId,
    pendingDeleteInspectionId,
    pendingDeleteCodeId,
    pendingDeleteMarketId,
    inspectorFilter,
    editingUserId,
    editingUser,
    editUserForm,
    isSavingUser,
    auditLogs,
    auditLogPage,
    logsLoading,
    reportStartDate,
    reportEndDate,
    userForm,
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
    userSearchQuery,
    userPage,
    userPageSize,
    filteredProfiles,
    paginatedProfiles,
    totalUserPages,
    paginatedAuditLogs,
    totalAuditLogPages,
    setUserSearchQuery,
    setUserPage,
    setUserPageSize,
    setActiveTab,
    setNewCode,
    setNewCodeDesc,
    setNewMarketName,
    setPreviewImageUrl,
    setPendingDeleteUserId,
    setPendingDeleteInspectionId,
    setPendingDeleteCodeId,
    setPendingDeleteMarketId,
    setInspectorFilter,
    setAuditLogPage,
    setReportStartDate,
    setReportEndDate,
    setUserForm,
    resetUserForm,
    setEditUserForm,
    closeEditUserModal,
    handleSaveEditUser,
    loadData,
    loadAuditLogs,
    handleRefresh,
    handleStartEditUser,
    handleSubmitUserForm,
    handleDeleteUser,
    confirmDeleteUser,
    handleDeleteInspection,
    confirmDeleteInspection,
    handleExportCSV,
    handleExportJSON,
    handleExportPDF,
    handleCreateCode,
    handleDeleteCode,
    confirmDeleteCode,
    handleToggleCode,
    handleCreateMarket,
    handleDeleteMarket,
    confirmDeleteMarket,
  };
}

export type AdminDashboardPageViewModel = ReturnType<
  typeof useAdminDashboardPage
>;
