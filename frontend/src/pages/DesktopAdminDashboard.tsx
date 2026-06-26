import { useState, useEffect, useMemo } from "react";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DeveloperOptionsPanel } from "@/components/DeveloperOptionsPanel";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { profileClient, type Profile } from "@/integrations/api/ProfileClient";
import { inspectionClient } from "@/integrations/api/InspectionClient";
import { accessCodeClient, type AccessCode } from "@/integrations/api/AccessCodeClient";
import { marketLocationClient, type MarketLocation } from "@/integrations/api/MarketLocationClient";
import { auditLogClient, type AuditLogEntry } from "@/integrations/api/AuditLogClient";
import type { Inspection, FreshnessClassification } from "@/types/inspection";
import {
  Loader2,
  Trash2,
  ClipboardList,
  Download,
  KeyRound,
  Plus,
  Copy,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  LayoutGrid,
  Users,
  RefreshCcw,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Pencil,
  MapPin,
  FileBarChart2,
  ScrollText,
  Bug,
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay, isAfter } from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

type RoleStat = {
  role: string;
  count: number;
};

type ManagedUserForm = {
  full_name: string;
  email: string;
  password: string;
  inspector_code: string;
  location: string;
};

const classColors: Record<FreshnessClassification, string> = {
  fresh: "bg-fresh",
  "not fresh": "bg-warning",
  acceptable: "bg-acceptable",
  warning: "bg-warning",
  spoiled: "bg-spoiled",
};

const PIE_COLORS: Record<FreshnessClassification, string> = {
  fresh: "hsl(142, 71%, 45%)",
  "not fresh": "hsl(38, 92%, 50%)",
  acceptable: "hsl(48, 96%, 53%)",
  warning: "hsl(25, 95%, 53%)",
  spoiled: "hsl(0, 84%, 60%)",
};

const MEAT_TYPE_LABELS = {
  beef: "Beef",
  pork: "Pork",
  chicken: "Chicken",
  fish: "Fish",
  other: "Other",
} as const;

const ANALYTICS_DAYS = 14;
const MAX_ANALYTICS_ITEMS = 6;
const REPORT_DEFAULT_RANGE_DAYS = 30;
const REPORT_PDF_DETAIL_ROW_LIMIT = 60;
const UNKNOWN_INSPECTOR_LABEL = "Unknown Inspector";
const UNSPECIFIED_LOCATION_LABEL = "Unspecified";
const REPORT_CLASSIFICATIONS: FreshnessClassification[] = ["fresh", "not fresh", "acceptable", "warning", "spoiled"];

type ReportRow = {
  id: string;
  createdAt: string;
  capturedAt: string | null;
  inspector: string;
  inspectorEmail: string;
  inspectorCode: string;
  location: string;
  profileLocation: string;
  meatType: string;
  classification: FreshnessClassification;
  confidenceScore: number;
  flaggedDeviations: string;
  explanation: string;
  inspectorNotes: string;
  imageUrl: string;
};

type ReportLocationBreakdown = {
  location: string;
  count: number;
  spoiledCount: number;
  spoiledRate: number;
  averageConfidence: number;
};

type ReportDailyTrendRow = {
  date: string;
  count: number;
  spoiledCount: number;
  averageConfidence: number;
};

const tabs = [
  { key: "overview" as const, label: "Overview", icon: LayoutGrid },
  { key: "users" as const, label: "Users", icon: Users },
  { key: "inspections" as const, label: "Inspections", icon: ClipboardList },
  { key: "codes" as const, label: "Access Codes", icon: KeyRound },
  { key: "markets" as const, label: "Markets", icon: MapPin },
  { key: "reports" as const, label: "Reports", icon: FileBarChart2 },
  { key: "logs" as const, label: "Logs", icon: ScrollText },
  { key: "developer" as const, label: "Developer Options", icon: Bug },
];

const getInspectorLabel = (profile?: Profile) =>
  profile?.full_name?.trim() || profile?.email?.trim() || profile?.inspector_code?.trim() || UNKNOWN_INSPECTOR_LABEL;

const getLocationLabel = (inspectionLocation: string | null, profile?: Profile) =>
  inspectionLocation?.trim() || profile?.location?.trim() || UNSPECIFIED_LOCATION_LABEL;

const truncateChartLabel = (value: string) => (value.length > 12 ? `${value.slice(0, 12)}...` : value);
const normalizeMarketName = (value: string) => value.trim().replace(/\s+/g, " ");

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const toCsvValue = (value: unknown): string => {
  const raw = value == null ? "" : String(value);
  if (raw.includes(",") || raw.includes("\n") || raw.includes('"')) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
};

const getOptionalText = (value: string | null | undefined): string => value?.trim() || "-";

const formatReportDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, "yyyy-MM-dd HH:mm:ss");
};

const parsePayloadText = (payload: Record<string, unknown>, key: string): string => {
  const value = payload[key];
  return typeof value === "string" ? value : "";
};

const parsePayloadActor = (payload: Record<string, unknown>): { id: string; role: string } => {
  const actor = payload.actor;
  if (!actor || typeof actor !== "object" || Array.isArray(actor)) {
    return { id: "-", role: "-" };
  }

  const actorRecord = actor as Record<string, unknown>;
  const id = typeof actorRecord.id === "string" && actorRecord.id.trim() ? actorRecord.id : "-";
  const role = typeof actorRecord.role === "string" && actorRecord.role.trim() ? actorRecord.role : "-";

  return { id, role };
};

const parsePayloadSource = (payload: Record<string, unknown>): { ip: string; userAgent: string } => {
  const source = payload.source;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return { ip: "-", userAgent: "-" };
  }

  const sourceRecord = source as Record<string, unknown>;
  const ip = typeof sourceRecord.ip === "string" && sourceRecord.ip.trim() ? sourceRecord.ip : "-";
  const userAgent =
    typeof sourceRecord.user_agent === "string" && sourceRecord.user_agent.trim() ? sourceRecord.user_agent : "-";

  return { ip, userAgent };
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [marketLocations, setMarketLocations] = useState<MarketLocation[]>([]);
  const [stats, setStats] = useState<{ total_users: number; total_inspections: number; roles: RoleStat[] | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "inspections" | "codes" | "markets" | "reports" | "logs" | "developer">("overview");
  const [newCode, setNewCode] = useState("");
  const [newCodeDesc, setNewCodeDesc] = useState("");
  const [newMarketName, setNewMarketName] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<string | null>(null);
  const [pendingDeleteInspectionId, setPendingDeleteInspectionId] = useState<string | null>(null);
  const [pendingDeleteCodeId, setPendingDeleteCodeId] = useState<string | null>(null);
  const [pendingDeleteMarketId, setPendingDeleteMarketId] = useState<string | null>(null);
  const [inspectorFilter, setInspectorFilter] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
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
    location: "",
  });

  useEffect(() => {
    void loadData();
  }, []);

  const resetUserForm = () => {
    setUserForm({
      full_name: "",
      email: "",
      password: "",
      inspector_code: "",
      location: "",
    });
    setEditingUserId(null);
  };

  const handleStartEditUser = (profile: Profile) => {
    setEditingUserId(profile.id);
    setUserForm({
      full_name: profile.full_name || "",
      email: profile.email || "",
      password: "",
      inspector_code: profile.inspector_code || "",
      location: profile.location || "",
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileData, inspectionData, statsData, codesData, marketsData] = await Promise.all([
        profileClient.getAllProfiles(),
        inspectionClient.getAll(200, 0, "all"),
        profileClient.getUserStats(),
        accessCodeClient.getAll(),
        marketLocationClient.getAll(),
      ]);
      setProfiles(profileData);
      setInspections(inspectionData);
      setStats(statsData);
      setAccessCodes(codesData);
      setMarketLocations([...marketsData].sort((left, right) => left.name.localeCompare(right.name)));
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

    if (!email) {
      toast.error("Email is required");
      return;
    }

    if (!editingUserId && password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (editingUserId && password.length > 0 && password.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    setIsSavingUser(true);

    try {
      if (editingUserId) {
        const updated = await profileClient.updateUserByAdmin(editingUserId, {
          email,
          full_name: userForm.full_name.trim() || null,
          inspector_code: userForm.inspector_code.trim() || null,
          location: userForm.location.trim() || null,
          ...(password ? { password } : {}),
        });

        setProfiles((prev) => prev.map((p) => (p.id === editingUserId ? updated : p)));
        toast.success("User updated");
      } else {
        const created = await profileClient.createUserByAdmin({
          email,
          password,
          full_name: userForm.full_name.trim() || null,
          inspector_code: userForm.inspector_code.trim() || null,
          location: userForm.location.trim() || null,
        });

        setProfiles((prev) => [created, ...prev]);
        setStats((prev) => prev ? { ...prev, total_users: prev.total_users + 1 } : prev);
        toast.success("User created");
      }

      resetUserForm();
    } catch (err) {
      console.error("Failed to save user:", err);
      const message = err instanceof Error && err.message ? err.message : "Failed to save user";
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
      setStats((prev) => prev ? { ...prev, total_users: Math.max(0, prev.total_users - 1) } : prev);
      if (editingUserId === profileId) resetUserForm();
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

      return {
        id: inspection.id,
        createdAt: inspection.created_at,
        capturedAt: inspection.captured_at ?? null,
        inspector: getInspectorLabel(profile),
        inspectorEmail: getOptionalText(profile?.email),
        inspectorCode: getOptionalText(profile?.inspector_code),
        location: getLocationLabel(inspection.location, profile),
        profileLocation: getOptionalText(profile?.location),
        meatType: inspection.meat_type,
        classification: inspection.classification,
        confidenceScore: inspection.confidence_score,
        flaggedDeviations: inspection.flagged_deviations.length > 0 ? inspection.flagged_deviations.join("; ") : "-",
        explanation: getOptionalText(inspection.explanation),
        inspectorNotes: getOptionalText(inspection.inspector_notes),
        imageUrl: getOptionalText(inspection.image_url),
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
    const uniqueLocations = new Set(reportRows.map((row) => row.location)).size;
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
      const current = aggregates.get(row.location) ?? { count: 0, spoiledCount: 0, totalConfidence: 0 };
      current.count += 1;
      current.totalConfidence += row.confidenceScore;
      if (row.classification === "spoiled") {
        current.spoiledCount += 1;
      }
      aggregates.set(row.location, current);
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

  const chartConfig = {
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

  const mobileCategoryAxisProps = {
    tick: { fontSize: 10 },
    tickFormatter: truncateChartLabel,
    interval: 0 as const,
    angle: -24,
    textAnchor: "end" as const,
    height: 52,
    className: "fill-muted-foreground",
  };

  const mobileTimeAxisProps = {
    tick: { fontSize: 10 },
    minTickGap: 20,
    tickMargin: 6,
    className: "fill-muted-foreground",
  };

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
      "Profile Location",
      "Meat Type",
      "Classification",
      "Confidence",
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
      row.profileLocation,
      row.meatType,
      row.classification,
      row.confidenceScore,
      row.flaggedDeviations,
      row.explanation,
      row.inspectorNotes,
      row.imageUrl,
    ]);
    const csv = [headers, ...rows]
      .map((record) => record.map((value) => toCsvValue(value)).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, `MeatLens-report-detail-${getReportFileSuffix()}.csv`);
    toast.success("CSV detail report exported");
  };

  const handleExportJSON = () => {
    if (!validateReportRange()) return;

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
      inspections: reportRows,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    triggerDownload(blob, `MeatLens-report-snapshot-${getReportFileSuffix()}.json`);
    toast.success("JSON snapshot report exported");
  };

  const handleExportPDF = () => {
    if (!validateReportRange()) return;

    const generatedAt = format(new Date(), "MMM d, yyyy h:mm a");
    const generatedBy = user?.email ?? user?.id ?? "admin";
    const classRows = reportClassShare
      .map((entry) => {
        return `<tr><td>${escapeHtml(entry.classification)}</td><td>${entry.count}</td><td>${entry.share}%</td></tr>`;
      })
      .join("");
    const classChartRows = reportClassShare
      .map((entry) => `
        <div class="bar-row">
          <div class="bar-label"><span>${escapeHtml(entry.classification)}</span><span>${entry.count} (${entry.share}%)</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${entry.share}%; background:${PIE_COLORS[entry.classification]};"></div></div>
        </div>`)
      .join("");

    const inspectorRows = reportTopInspectors.length > 0
      ? reportTopInspectors
        .map((entry) => `<tr><td>${escapeHtml(entry.inspector)}</td><td>${entry.count}</td><td>${entry.averageConfidence}%</td></tr>`)
        .join("")
      : '<tr><td colspan="3">No inspector data in this range.</td></tr>';

    const locationRows = reportTopLocations.length > 0
      ? reportTopLocations
        .map((entry) => `<tr><td>${escapeHtml(entry.location)}</td><td>${entry.count}</td><td>${entry.spoiledCount}</td><td>${entry.spoiledRate}%</td><td>${entry.averageConfidence}%</td></tr>`)
        .join("")
      : '<tr><td colspan="5">No location data in this range.</td></tr>';

    const meatTypeRows = reportByMeatType.length > 0
      ? reportByMeatType
        .map((entry) => `<tr><td>${escapeHtml(entry.meatType)}</td><td>${entry.count}</td></tr>`)
        .join("")
      : '<tr><td colspan="2">No meat type data in this range.</td></tr>';

    const dailyRows = reportDailyTrend.length > 0
      ? reportDailyTrend
        .map((entry) => `<tr><td>${escapeHtml(entry.date)}</td><td>${entry.count}</td><td>${entry.spoiledCount}</td><td>${entry.averageConfidence}%</td></tr>`)
        .join("")
      : '<tr><td colspan="4">No daily trend data in this range.</td></tr>';

    const maxLocationCount = reportTopLocations.reduce((max, entry) => Math.max(max, entry.count), 0);
    const locationChartRows = reportTopLocations.length > 0
      ? reportTopLocations
        .map((entry) => {
          const width = maxLocationCount > 0 ? Math.round((entry.count / maxLocationCount) * 100) : 0;
          return `
          <div class="bar-row">
            <div class="bar-label"><span>${escapeHtml(entry.location)}</span><span>${entry.count} inspections</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${width}%; background:#2563eb;"></div></div>
          </div>`;
        })
        .join("")
      : '<p class="note">No location chart data in this range.</p>';

    const maxDailyCount = reportDailyTrend.reduce((max, entry) => Math.max(max, entry.count), 0);
    const dailyChartRows = reportDailyTrend.length > 0
      ? reportDailyTrend
        .map((entry) => {
          const width = maxDailyCount > 0 ? Math.round((entry.count / maxDailyCount) * 100) : 0;
          return `
          <div class="bar-row">
            <div class="bar-label"><span>${escapeHtml(entry.date)}</span><span>${entry.count} inspections</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${width}%; background:#0891b2;"></div></div>
          </div>`;
        })
        .join("")
      : '<p class="note">No daily chart data in this range.</p>';

    const detailRows = reportRows
      .slice(0, REPORT_PDF_DETAIL_ROW_LIMIT)
      .map((row) => `
        <tr>
          <td>${escapeHtml(formatReportDateTime(row.createdAt))}</td>
          <td>${escapeHtml(row.inspector)}</td>
          <td>${escapeHtml(row.location)}</td>
          <td>${escapeHtml(row.meatType)}</td>
          <td>${escapeHtml(row.classification)}</td>
          <td>${row.confidenceScore}%</td>
          <td>${escapeHtml(row.flaggedDeviations)}</td>
          <td>${escapeHtml(row.inspectorNotes)}</td>
        </tr>`)
      .join("");
    const detailRowsNotice = reportRows.length > REPORT_PDF_DETAIL_ROW_LIMIT
      ? `<p class="note">Showing first ${REPORT_PDF_DETAIL_ROW_LIMIT} of ${reportRows.length} inspection records in this PDF. Use CSV or JSON for full raw detail.</p>`
      : "";

    const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>MeatLens Report ${escapeHtml(reportStartDate)} to ${escapeHtml(reportEndDate)}</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        color: #0f172a;
        margin: 0;
        padding: 24px;
        background: #f8fafc;
      }
      .sheet {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 24px;
      }
      h1 {
        margin: 0;
        font-size: 26px;
        letter-spacing: 0.01em;
      }
      .meta {
        margin-top: 8px;
        color: #475569;
        font-size: 12px;
      }
      .summary-grid {
        margin-top: 18px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
      }
      .summary-card {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px;
      }
      .summary-card span {
        display: block;
        color: #64748b;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .summary-card strong {
        display: block;
        margin-top: 6px;
        font-size: 24px;
      }
      section {
        margin-top: 18px;
      }
      h2 {
        margin: 0 0 8px;
        font-size: 16px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .note {
        margin: 8px 0 0;
        color: #64748b;
        font-size: 11px;
      }
      .two-column {
        display: grid;
        gap: 16px;
      }
      .bar-row {
        margin-bottom: 10px;
      }
      .bar-label {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 4px;
        font-size: 11px;
        color: #334155;
      }
      .bar-track {
        height: 8px;
        border-radius: 999px;
        background: #e2e8f0;
        overflow: hidden;
      }
      .bar-fill {
        height: 8px;
        border-radius: 999px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #e2e8f0;
        font-size: 12px;
      }
      th, td {
        border: 1px solid #e2e8f0;
        padding: 8px;
        text-align: left;
      }
      th {
        background: #f1f5f9;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      @media (min-width: 960px) {
        .two-column {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media print {
        body {
          background: white;
          padding: 0;
        }
        .sheet {
          border: none;
          border-radius: 0;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <article class="sheet">
      <h1>MeatLens Admin Report</h1>
      <p class="meta">Range: ${escapeHtml(reportStartDate)} to ${escapeHtml(reportEndDate)} | Generated: ${escapeHtml(generatedAt)} | Generated By: ${escapeHtml(generatedBy)}</p>
      <div class="summary-grid">
        <div class="summary-card"><span>Total Inspections</span><strong>${reportSummary.total}</strong></div>
        <div class="summary-card"><span>Average Confidence</span><strong>${reportSummary.averageConfidence}%</strong></div>
        <div class="summary-card"><span>Spoiled Rate</span><strong>${reportSummary.spoiledRate}%</strong></div>
        <div class="summary-card"><span>Unique Inspectors</span><strong>${reportSummary.uniqueInspectors}</strong></div>
        <div class="summary-card"><span>Unique Locations</span><strong>${reportSummary.uniqueLocations}</strong></div>
        <div class="summary-card"><span>Records With Deviations</span><strong>${reportSummary.flaggedRecords}</strong></div>
      </div>
      <section>
        <h2>Classification Breakdown (Chart + Table)</h2>
        <div>${classChartRows}</div>
        <table>
          <thead><tr><th>Classification</th><th>Count</th><th>Share</th></tr></thead>
          <tbody>${classRows}</tbody>
        </table>
      </section>
      <section>
        <div class="two-column">
          <div>
            <h2>Top Inspectors</h2>
            <table>
              <thead><tr><th>Inspector</th><th>Inspections</th><th>Avg Confidence</th></tr></thead>
              <tbody>${inspectorRows}</tbody>
            </table>
          </div>
          <div>
            <h2>Top Locations</h2>
            <div>${locationChartRows}</div>
            <table>
              <thead><tr><th>Location</th><th>Inspections</th><th>Spoiled</th><th>Spoiled Rate</th><th>Avg Confidence</th></tr></thead>
              <tbody>${locationRows}</tbody>
            </table>
          </div>
        </div>
      </section>
      <section>
        <div class="two-column">
          <div>
            <h2>Meat Type Distribution</h2>
            <table>
              <thead><tr><th>Meat Type</th><th>Inspections</th></tr></thead>
              <tbody>${meatTypeRows}</tbody>
            </table>
          </div>
          <div>
            <h2>Daily Inspection Trend</h2>
            <div>${dailyChartRows}</div>
            <table>
              <thead><tr><th>Date</th><th>Inspections</th><th>Spoiled</th><th>Avg Confidence</th></tr></thead>
              <tbody>${dailyRows}</tbody>
            </table>
          </div>
        </div>
      </section>
      <section>
        <h2>Inspection Detail</h2>
        ${detailRowsNotice}
        <table>
          <thead><tr><th>Created At</th><th>Inspector</th><th>Location</th><th>Meat Type</th><th>Class</th><th>Confidence</th><th>Flagged Deviations</th><th>Inspector Notes</th></tr></thead>
          <tbody>${detailRows}</tbody>
        </table>
      </section>
    </article>
  </body>
</html>`;

    const reportBlob = new Blob([html], { type: "text/html;charset=utf-8" });
    const reportUrl = URL.createObjectURL(reportBlob);
    const reportWindow = window.open(reportUrl, "_blank");

    if (!reportWindow) {
      URL.revokeObjectURL(reportUrl);
      triggerDownload(reportBlob, `MeatLens-report-summary-${getReportFileSuffix()}.html`);
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

    toast.success("PDF summary opened. Use Save as PDF in the print dialog.");
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeTabConfig = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const ActiveTabIcon = activeTabConfig.icon;

  const auditLogsPerPage = 5;
  const paginatedAuditLogs = auditLogs.slice((auditLogPage - 1) * auditLogsPerPage, auditLogPage * auditLogsPerPage);
  const totalAuditLogPages = Math.ceil(auditLogs.length / auditLogsPerPage);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]">
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-60 flex-shrink-0 border-r border-border/70 bg-card/95">
          <div className="flex h-16 items-center border-b border-border/70 px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-[hsl(var(--primary)/0.15)]">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <span className="ml-3 font-display text-base font-semibold tracking-tight">MeatLens</span>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  activeTab === key
                    ? "bg-[hsl(var(--primary)/0.16)] text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border/70 bg-card/95 px-6">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-xl font-semibold tracking-tight">Admin Dashboard</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                <ActiveTabIcon className="h-3.5 w-3.5" />
                {activeTabConfig.label}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === "logs") {
                  void loadAuditLogs();
                  return;
                }
                void loadData();
              }}
              className="gap-2 rounded-xl"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-6 pb-24">
            <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6">
              <section className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-[0_24px_70px_-34px_rgba(0,0,0,0.65)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.15)]">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold tracking-tight">Admin Dashboard</h1>
                <p className="text-xs text-muted-foreground">System management and analytics hub</p>
              </div>
            </div>
            <div className="flex w-full flex-col items-stretch gap-2 min-[420px]:w-auto min-[420px]:flex-row min-[420px]:items-center">
              <Button variant="outline" size="sm" onClick={() => void loadData()} className="gap-2 rounded-xl">
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Total Users</p>
              <p className="mt-1 font-display text-3xl font-semibold">{stats?.total_users || 0}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Total Inspections</p>
              <p className="mt-1 font-display text-3xl font-semibold">{stats?.total_inspections || 0}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Avg Confidence</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-display text-3xl font-semibold">{avgConfidence}%</p>
                <CheckCircle className="h-4 w-4 text-fresh" />
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Spoiled Rate</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-display text-3xl font-semibold">{spoiledRate}%</p>
                {spoiledRate > 20 ? <AlertTriangle className="h-4 w-4 text-spoiled" /> : <CheckCircle className="h-4 w-4 text-fresh" />}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-border/70 bg-background/50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">7-Day Movement vs Previous Week</p>
                <p className="font-display text-lg font-semibold">{recentTrend >= 0 ? "+" : ""}{recentTrend}% inspections</p>
              </div>
              {recentTrend >= 0 ? <TrendingUp className="h-8 w-8 text-fresh" /> : <TrendingDown className="h-8 w-8 text-warning" />}
            </div>
          </div>
        </section>

        {isMobile && (
          <section className="mt-4 rounded-3xl border border-border/70 bg-card/85 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="group flex w-full items-center justify-between rounded-2xl border border-primary/40 bg-[hsl(var(--primary)/0.16)] px-4 py-3 text-left transition-colors hover:bg-[hsl(var(--primary)/0.20)]"
                >
                  <span className="flex items-center gap-2">
                    <ActiveTabIcon className="h-4 w-4 text-foreground" />
                    <span className="font-display text-sm uppercase tracking-wider text-foreground">{activeTabConfig.label}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(100vw-2rem)] rounded-2xl border-border/70 bg-card/95 p-1">
                {tabs.map(({ key, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={key}
                    onSelect={() => setActiveTab(key)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 font-display text-xs uppercase tracking-wider ${
                      activeTab === key ? "bg-[hsl(var(--primary)/0.16)] text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </section>
        )}

        <div className="mt-4 space-y-4">
          {activeTab === "overview" && (
            <>
              <div className="grid min-w-0 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                  <CardHeader>
                    <CardTitle className="text-sm font-display uppercase tracking-wider">Daily Inspections (14 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[260px] w-full min-w-0">
                      <AreaChart data={dailyInspections}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                  <CardHeader>
                    <CardTitle className="text-sm font-display uppercase tracking-wider">Classification Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[260px] w-full min-w-0">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3}>
                          {pieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-3xl border-border/70 bg-card/95">
                <CardHeader>
                  <CardTitle className="text-sm font-display uppercase tracking-wider">Classification Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(["fresh", "not fresh", "acceptable", "warning", "spoiled"] as FreshnessClassification[]).map((c) => {
                    const count = classificationCounts[c] || 0;
                    const pct = inspections.length > 0 ? (count / inspections.length) * 100 : 0;
                    return (
                      <div key={c}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-display text-xs uppercase tracking-wider">{c}</span>
                          <span className="font-display text-xs text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div className={`h-full rounded-full transition-all ${classColors[c]}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {stats?.roles && (
                <Card className="rounded-3xl border-border/70 bg-card/95">
                  <CardHeader>
                    <CardTitle className="text-sm font-display uppercase tracking-wider">Users by Role</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {stats.roles.map((r) => (
                        <div key={r.role} className="rounded-2xl border border-border/70 bg-background/50 p-3">
                          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{r.role}</p>
                          <p className="mt-1 font-display text-2xl font-semibold">{r.count}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <section className="space-y-4">
                <div className="rounded-3xl border border-border/70 bg-card/95 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Business Analytics</p>
                  <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">Operational trends and risk hotspots</h2>
                  <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                    Compare inspector output, product mix, location risk, and day-by-day quality shifts without leaving the overview.
                  </p>
                </div>

                <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                  <CardHeader>
                    <CardTitle className="text-sm font-display uppercase tracking-wider">Inspector Performance</CardTitle>
                    <CardDescription>Track who is handling the most inspections and how confidently those results are being recorded.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid min-w-0 gap-4 xl:grid-cols-2">
                    <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Top Inspectors by Inspection Volume</p>
                      {inspectorAnalytics.length > 0 ? (
                        <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                          <BarChart data={inspectorAnalytics} layout={isMobile ? undefined : "vertical"} margin={isMobile ? { top: 8, right: 4, left: 0, bottom: 8 } : { left: 12, right: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                            {isMobile ? (
                              <>
                                <XAxis dataKey="inspector" {...mobileCategoryAxisProps} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} className="fill-muted-foreground" />
                              </>
                            ) : (
                              <>
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                <YAxis
                                  type="category"
                                  dataKey="inspector"
                                  width={88}
                                  tick={{ fontSize: 11 }}
                                  tickFormatter={truncateChartLabel}
                                  className="fill-muted-foreground"
                                />
                              </>
                            )}
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="hsl(var(--primary))" />
                          </BarChart>
                        </ChartContainer>
                      ) : (
                        <p className="mt-4 text-sm text-muted-foreground">No inspection data yet.</p>
                      )}
                    </div>

                    <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Average Confidence by Inspector</p>
                      {inspectorAnalytics.length > 0 ? (
                        <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                          <BarChart data={inspectorAnalytics} layout={isMobile ? undefined : "vertical"} margin={isMobile ? { top: 8, right: 4, left: 0, bottom: 8 } : { left: 12, right: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                            {isMobile ? (
                              <>
                                <XAxis dataKey="inspector" {...mobileCategoryAxisProps} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} className="fill-muted-foreground" />
                              </>
                            ) : (
                              <>
                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                <YAxis
                                  type="category"
                                  dataKey="inspector"
                                  width={88}
                                  tick={{ fontSize: 11 }}
                                  tickFormatter={truncateChartLabel}
                                  className="fill-muted-foreground"
                                />
                              </>
                            )}
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="confidence" radius={[0, 8, 8, 0]} fill="hsl(var(--warning))" />
                          </BarChart>
                        </ChartContainer>
                      ) : (
                        <p className="mt-4 text-sm text-muted-foreground">No inspection data yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                  <CardHeader>
                    <CardTitle className="text-sm font-display uppercase tracking-wider">Meat Type Trends</CardTitle>
                    <CardDescription>Separate product throughput from spoilage risk to see which categories need more attention.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid min-w-0 gap-4 xl:grid-cols-2">
                    <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Inspections by Meat Type</p>
                      {meatTypeAnalytics.length > 0 ? (
                        <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                          <BarChart data={meatTypeAnalytics}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                            <XAxis
                              dataKey="meatType"
                              {...(isMobile ? mobileCategoryAxisProps : { tick: { fontSize: 11 }, className: "fill-muted-foreground" })}
                            />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="hsl(var(--primary))" />
                          </BarChart>
                        </ChartContainer>
                      ) : (
                        <p className="mt-4 text-sm text-muted-foreground">No inspection data yet.</p>
                      )}
                    </div>

                    <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Spoiled Rate by Meat Type</p>
                      {meatTypeAnalytics.length > 0 ? (
                        <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                          <BarChart data={meatTypeAnalytics}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                            <XAxis
                              dataKey="meatType"
                              {...(isMobile ? mobileCategoryAxisProps : { tick: { fontSize: 11 }, className: "fill-muted-foreground" })}
                            />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="spoiledRate" radius={[8, 8, 0, 0]} fill={PIE_COLORS.spoiled} />
                          </BarChart>
                        </ChartContainer>
                      ) : (
                        <p className="mt-4 text-sm text-muted-foreground">No inspection data yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                  <CardHeader>
                    <CardTitle className="text-sm font-display uppercase tracking-wider">Location Trends</CardTitle>
                    <CardDescription>
                      Blank inspection and profile locations roll up under {UNSPECIFIED_LOCATION_LABEL} so missing routing data still surfaces in the overview.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid min-w-0 gap-4 xl:grid-cols-2">
                    <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Top Locations by Inspection Count</p>
                      {locationAnalytics.length > 0 ? (
                        <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                          <BarChart data={locationAnalytics} layout={isMobile ? undefined : "vertical"} margin={isMobile ? { top: 8, right: 4, left: 0, bottom: 8 } : { left: 12, right: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                            {isMobile ? (
                              <>
                                <XAxis dataKey="location" {...mobileCategoryAxisProps} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} className="fill-muted-foreground" />
                              </>
                            ) : (
                              <>
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                <YAxis
                                  type="category"
                                  dataKey="location"
                                  width={88}
                                  tick={{ fontSize: 11 }}
                                  tickFormatter={truncateChartLabel}
                                  className="fill-muted-foreground"
                                />
                              </>
                            )}
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="hsl(var(--primary))" />
                          </BarChart>
                        </ChartContainer>
                      ) : (
                        <p className="mt-4 text-sm text-muted-foreground">No inspection data yet.</p>
                      )}
                    </div>

                    <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Spoiled Share by Location</p>
                      {locationAnalytics.length > 0 ? (
                        <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                          <BarChart data={locationAnalytics} layout={isMobile ? undefined : "vertical"} margin={isMobile ? { top: 8, right: 4, left: 0, bottom: 8 } : { left: 12, right: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                            {isMobile ? (
                              <>
                                <XAxis dataKey="location" {...mobileCategoryAxisProps} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} className="fill-muted-foreground" />
                              </>
                            ) : (
                              <>
                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                <YAxis
                                  type="category"
                                  dataKey="location"
                                  width={88}
                                  tick={{ fontSize: 11 }}
                                  tickFormatter={truncateChartLabel}
                                  className="fill-muted-foreground"
                                />
                              </>
                            )}
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="spoiledRate" radius={[0, 8, 8, 0]} fill={PIE_COLORS.spoiled} />
                          </BarChart>
                        </ChartContainer>
                      ) : (
                        <p className="mt-4 text-sm text-muted-foreground">No inspection data yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                  <CardHeader>
                    <CardTitle className="text-sm font-display uppercase tracking-wider">Quality Signals</CardTitle>
                    <CardDescription>Follow day-by-day confidence stability and how the freshness mix shifts across the recent inspection window.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid min-w-0 gap-4 xl:grid-cols-2">
                    <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Average Confidence Trend</p>
                      <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                        <AreaChart data={confidenceTrendData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis
                            dataKey="date"
                            {...(isMobile ? mobileTimeAxisProps : { tick: { fontSize: 11 }, className: "fill-muted-foreground" })}
                          />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Area type="monotone" dataKey="confidence" stroke="hsl(var(--warning))" fill="hsl(var(--warning) / 0.18)" />
                        </AreaChart>
                      </ChartContainer>
                    </div>

                    <div className="min-w-0 rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Freshness Mix by Day</p>
                        <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS.fresh }} />Fresh</span>
                          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS["not fresh"] }} />Not Fresh</span>
                          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS.acceptable }} />Acceptable</span>
                          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS.warning }} />Warning</span>
                          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS.spoiled }} />Spoiled</span>
                        </div>
                      </div>
                      <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full min-w-0 sm:h-[240px]">
                        <BarChart data={freshnessMixData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis
                            dataKey="date"
                            {...(isMobile ? mobileTimeAxisProps : { tick: { fontSize: 11 }, className: "fill-muted-foreground" })}
                          />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="fresh" stackId="freshness" fill={PIE_COLORS.fresh} />
                          <Bar dataKey="notFresh" stackId="freshness" fill={PIE_COLORS["not fresh"]} />
                          <Bar dataKey="acceptable" stackId="freshness" fill={PIE_COLORS.acceptable} />
                          <Bar dataKey="warning" stackId="freshness" fill={PIE_COLORS.warning} />
                          <Bar dataKey="spoiled" stackId="freshness" fill={PIE_COLORS.spoiled} radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </>
          )}

          {activeTab === "users" && (
            <div className="grid min-w-0 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
                    <UserPlus className="h-4 w-4" />
                    {editingUserId ? "Edit User" : "Add User"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Full Name</Label>
                    <Input
                      value={userForm.full_name}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Juan dela Cruz"
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="inspector@example.com"
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                      {editingUserId ? "New Password (Optional)" : "Password"}
                    </Label>
                    <Input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder={editingUserId ? "Leave blank to keep current password" : "At least 6 characters"}
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Inspector Code</Label>
                    <Input
                      value={userForm.inspector_code}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, inspector_code: e.target.value }))}
                      placeholder="INSPECTOR-2026"
                      className="h-10 rounded-xl font-display tracking-wider"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Location</Label>
                    <Input
                      value={userForm.location}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, location: e.target.value }))}
                      placeholder="Quezon City"
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => void handleSubmitUserForm()}
                      className="h-10 rounded-xl gap-1"
                      disabled={isSavingUser}
                    >
                      {isSavingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : editingUserId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {editingUserId ? "Save Changes" : "Create User"}
                    </Button>
                    {editingUserId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetUserForm}
                        className="h-10 rounded-xl"
                        disabled={isSavingUser}
                      >
                        Cancel Edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
                    <Users className="h-4 w-4" />
                    Registered Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profiles.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No users found</p>
                  ) : (
                    <div className="space-y-3">
                      {profiles.map((p) => (
                        <div key={p.id} className="rounded-2xl border border-border/70 bg-background/50 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-display text-base font-semibold">{p.full_name || "Unnamed"}</p>
                              <p className="truncate text-xs text-muted-foreground">{p.email || "No email"}</p>
                            </div>
                            <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                              {p.id === user?.id ? "You" : "User"}
                            </span>
                          </div>
                          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                            <p>Joined: {format(new Date(p.created_at), "MMM d, yyyy")}</p>
                            <p>Location: {p.location || "No location"}</p>
                            <p className="break-all">Inspector Code: {p.inspector_code || "N/A"}</p>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg gap-1"
                              onClick={() => handleStartEditUser(p)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg gap-1 text-destructive hover:text-destructive"
                              onClick={() => void handleDeleteUser(p.id)}
                              disabled={p.id === user?.id}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "inspections" && (
            <Card className="rounded-3xl border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
                  <ClipboardList className="h-4 w-4" />
                  All Inspections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Filter by inspector name..."
                    value={inspectorFilter}
                    onChange={(e) => setInspectorFilter(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                  {inspectorFilter.trim() && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Showing {filteredInspections.length} of {inspections.length} inspection{inspections.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                {filteredInspections.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {inspectorFilter.trim() ? `No inspections found for "${inspectorFilter.trim()}"` : "No inspections yet"}
                  </p>
                ) : (
                  <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                    {filteredInspections.map((i) => (
                      <div key={i.id} className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-background/50 p-3">
                        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                          {i.image_url ? (
                            <button
                              type="button"
                              className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-border/70 touch-manipulation cursor-zoom-in sm:h-16 sm:w-16"
                              onClick={() => setPreviewImageUrl(i.image_url)}
                              onTouchEnd={() => setPreviewImageUrl(i.image_url)}
                              aria-label="View full inspection image"
                            >
                              <img src={i.image_url} alt="Sample" className="h-full w-full object-cover" />
                            </button>
                          ) : (
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-border/70 bg-secondary sm:h-16 sm:w-16">
                              <span className="font-display text-lg text-muted-foreground">{i.meat_type[0].toUpperCase()}</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="truncate font-display text-sm font-semibold capitalize">{i.meat_type}</span>
                              <FreshnessBadge classification={i.classification} size="sm" />
                            </div>
                            <p className="truncate text-xs font-medium text-foreground/80">{getInspectorLabel(i.user_id ? profileById.get(i.user_id) : undefined)}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(i.created_at), "MMM d, yyyy h:mm a")}</p>
                            <p className="text-xs text-muted-foreground">Confidence: {i.confidence_score}%</p>
                            <p className="truncate text-[10px] text-muted-foreground">ID: {i.id}</p>
                          </div>
                          <div className="col-span-2 flex justify-end border-t border-border/60 pt-2 sm:col-span-1 sm:block sm:border-t-0 sm:pt-0">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-xl border-border/70 text-destructive hover:text-destructive sm:h-9 sm:w-9"
                              onClick={() => void handleDeleteInspection(i.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "markets" && (
            <div className="grid min-w-0 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                <CardHeader>
                  <CardTitle className="text-sm font-display uppercase tracking-wider">Add Market Location</CardTitle>
                  <CardDescription>
                    Configure the capture station location options used by inspectors.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Market Name</Label>
                    <Input
                      placeholder="e.g. Old Market"
                      value={newMarketName}
                      onChange={(e) => setNewMarketName(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <Button size="sm" onClick={() => void handleCreateMarket()} className="h-10 rounded-xl gap-1">
                    <Plus className="h-4 w-4" />
                    Add Market
                  </Button>
                </CardContent>
              </Card>

              <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                <CardHeader>
                  <CardTitle className="text-sm font-display uppercase tracking-wider">Manage Market Locations</CardTitle>
                  <CardDescription>
                    Add or remove barangay markets shown in the capture station selector.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {marketLocations.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No markets configured yet</p>
                  ) : (
                    <div className="space-y-3">
                      {marketLocations.map((market) => (
                        <div key={market.id} className="rounded-2xl border border-border/70 bg-background/50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-display text-sm font-semibold">{market.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Created {format(new Date(market.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                              onClick={() => void handleDeleteMarket(market.id)}
                              aria-label={`Delete ${market.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "codes" && (
            <div className="grid min-w-0 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                <CardHeader>
                  <CardTitle className="text-sm font-display uppercase tracking-wider">Create Access Code</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Code</Label>
                    <Input
                      placeholder="e.g. INSPECTOR-2026"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      className="h-10 rounded-xl font-display tracking-wider"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Description</Label>
                    <Input
                      placeholder="Batch for Region V"
                      value={newCodeDesc}
                      onChange={(e) => setNewCodeDesc(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <Button size="sm" onClick={handleCreateCode} className="h-10 rounded-xl gap-1">
                    <Plus className="h-4 w-4" />
                    Generate
                  </Button>
                </CardContent>
              </Card>

              <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                <CardHeader>
                  <CardTitle className="text-sm font-display uppercase tracking-wider">Manage Access Codes</CardTitle>
                </CardHeader>
                <CardContent>
                  {accessCodes.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No access codes yet</p>
                  ) : (
                    <div className="space-y-3">
                      {accessCodes.map((c) => (
                        <div key={c.id} className="rounded-2xl border border-border/70 bg-background/50 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <span className="font-display text-sm font-semibold tracking-wider">{c.code}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${c.is_active ? "bg-fresh/20 text-fresh" : "bg-muted text-muted-foreground"}`}>
                                  {c.is_active ? "Active" : "Disabled"}
                                </span>
                              </div>
                              {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                              <p className="mt-1 text-[10px] text-muted-foreground">Used {c.times_used}x - Created {format(new Date(c.created_at), "MMM d, yyyy")}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(c.code);
                                    toast.success("Code copied");
                                  } catch {
                                    toast.error("Failed to copy code");
                                  }
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-xs font-display"
                                onClick={() => void handleToggleCode(c.id, !c.is_active)}
                              >
                                {c.is_active ? "OFF" : "ON"}
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                                onClick={() => void handleDeleteCode(c.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="mt-6 grid min-w-0 gap-4 xl:grid-cols-[1fr_1fr]">
              <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                <CardHeader>
                  <CardTitle className="font-display text-sm uppercase tracking-wider">Generate Reports</CardTitle>
                  <CardDescription className="text-xs">
                    Build PDF summary, CSV detail, or JSON snapshot for a selected date range.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="report-start-date" className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        Start Date
                      </Label>
                      <Input
                        id="report-start-date"
                        type="date"
                        value={reportStartDate}
                        onChange={(event) => setReportStartDate(event.target.value)}
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="report-end-date" className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        End Date
                      </Label>
                      <Input
                        id="report-end-date"
                        type="date"
                        value={reportEndDate}
                        onChange={(event) => setReportEndDate(event.target.value)}
                        className="h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  {reportDateRangeInvalid && (
                    <p className="text-xs text-destructive">Start date must be on or before end date.</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {reportRows.length} inspection{reportRows.length !== 1 ? "s" : ""} in range
                  </p>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="outline" className="flex-1 gap-2 rounded-xl" onClick={handleExportPDF}>
                      <Download className="h-4 w-4" />
                      PDF Summary
                    </Button>
                    <Button type="button" variant="outline" className="flex-1 gap-2 rounded-xl" onClick={handleExportCSV}>
                      <Download className="h-4 w-4" />
                      CSV Detail
                    </Button>
                    <Button type="button" className="flex-1 gap-2 rounded-xl" onClick={handleExportJSON}>
                      <Download className="h-4 w-4" />
                      JSON Snapshot
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                <CardHeader>
                  <CardTitle className="font-display text-sm uppercase tracking-wider">Report Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {reportRows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No inspections found for the selected range. Adjust the date filter above.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/70 bg-[hsl(var(--primary)/0.14)] p-3">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Total Inspections</p>
                        <p className="mt-1 font-display text-2xl font-semibold">{reportSummary.total}</p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-background/65 p-3">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Avg Confidence</p>
                        <p className="mt-1 font-display text-2xl font-semibold">{reportSummary.averageConfidence}%</p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-background/65 p-3">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Spoiled Rate</p>
                        <p className="mt-1 font-display text-2xl font-semibold">{reportSummary.spoiledRate}%</p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Fresh</p>
                        <p className="mt-1 font-display text-2xl font-semibold">{reportClassCounts.fresh}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="mt-6 space-y-4">
              <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
                <CardHeader>
                  <CardTitle className="font-display text-sm uppercase tracking-wider">Audit Logs</CardTitle>
                  <CardDescription className="text-xs">
                    Recent encrypted audit events decoded on the backend for admin review.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {logsLoading ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No audit logs found.</p>
                  ) : (
                    <>
                    <div className="space-y-3">
                      {paginatedAuditLogs.map((log) => {
                        const payload = log.payload ?? {};
                        const eventType = parsePayloadText(payload, "event_type") || "unknown.event";
                        const eventTime = parsePayloadText(payload, "event_time") || log.created_at;
                        const actor = parsePayloadActor(payload);
                        const source = parsePayloadSource(payload);

                        return (
                          <div key={log.id} className="rounded-2xl border border-border/70 bg-background/50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate font-display text-sm font-semibold tracking-tight">{eventType}</p>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  Stored {format(new Date(log.created_at), "MMM d, yyyy h:mm:ss a")}
                                </p>
                              </div>
                              <span className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                                {log.key_id}
                              </span>
                            </div>

                            <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                              <p className="truncate">Event Time: {eventTime}</p>
                              <p className="truncate">Actor Role: {actor.role}</p>
                              <p className="truncate">Actor ID: {actor.id}</p>
                              <p className="truncate">Source IP: {source.ip}</p>
                              <p className="truncate md:col-span-2">User Agent: {source.userAgent}</p>
                              <p className="truncate md:col-span-2">Client Event ID: {log.client_event_id}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {totalAuditLogPages > 1 && (
                      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4">
                        <p className="text-xs text-muted-foreground">
                          Page {auditLogPage} of {totalAuditLogPages}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAuditLogPage((p) => Math.max(1, p - 1))}
                            disabled={auditLogPage === 1}
                            className="h-8 px-2"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">Previous</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAuditLogPage((p) => Math.min(totalAuditLogPages, p + 1))}
                            disabled={auditLogPage === totalAuditLogPages}
                            className="h-8 px-2"
                          >
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">Next</span>
                          </Button>
                        </div>
                      </div>
                    )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "developer" && (
            <div className="mt-6">
              <DeveloperOptionsPanel />
            </div>
          )}
        </div>
      </div>
    </main>
  </div>
</div>

      <Dialog open={Boolean(previewImageUrl)} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="w-[min(96vw,980px)] max-w-5xl border-none bg-transparent p-0 shadow-none">
          {previewImageUrl && (
            <img
              src={previewImageUrl}
              alt="Inspection full view"
              className="max-h-[85vh] w-full rounded-2xl border border-border/70 bg-black/60 object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDeleteUserId)}
        onOpenChange={(open) => { if (!open) setPendingDeleteUserId(null); }}
        title="Delete user?"
        description="This will permanently delete the user and all related records. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteUser}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteInspectionId)}
        onOpenChange={(open) => { if (!open) setPendingDeleteInspectionId(null); }}
        title="Delete inspection?"
        description="Are you sure you want to delete this inspection record? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteInspection}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteCodeId)}
        onOpenChange={(open) => { if (!open) setPendingDeleteCodeId(null); }}
        title="Delete access code?"
        description="Are you sure you want to delete this access code? Users with this code will no longer be able to register."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteCode}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteMarketId)}
        onOpenChange={(open) => { if (!open) setPendingDeleteMarketId(null); }}
        title="Delete market location?"
        description="This location will be removed from the capture station selector for all users."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteMarket}
      />
    </div>
  );
};

export default AdminDashboard;
