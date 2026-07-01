import type { ReportOrganization } from "@/lib/reportOrganizations";
import type { FreshnessClassification } from "@/types/inspection";

export type AdminDashboardTabKey =
  | "overview"
  | "users"
  | "inspections"
  | "codes"
  | "markets"
  | "reports"
  | "logs"
  | "developer";

export type RoleStat = {
  role: string;
  count: number;
};

export type ManagedUserForm = {
  full_name: string;
  email: string;
  password: string;
  inspector_code: string;
  report_organization: ReportOrganization | "";
  location: string;
};

export type ReportRow = {
  id: string;
  createdAt: string;
  capturedAt: string | null;
  inspector: string;
  inspectorEmail: string;
  inspectorCode: string;
  manualLocation: string;
  location: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  profileLocation: string;
  meatType: string;
  classification: FreshnessClassification;
  confidenceScore: number;
  flaggedDeviations: string;
  explanation: string;
  inspectorNotes: string;
  imageUrl: string;
};

export type ReportLocationBreakdown = {
  location: string;
  count: number;
  spoiledCount: number;
  spoiledRate: number;
  averageConfidence: number;
};

export type ReportDailyTrendRow = {
  date: string;
  count: number;
  spoiledCount: number;
  averageConfidence: number;
};
