import type { ReportOrganization } from "@/lib/reportOrganizations";

export type ReportDocumentKind = "inspector_daily" | "admin_range";
export type ReportTemplateKey = "gcccs" | "dti" | "city_vet";

export interface ReportMetric {
  label: string;
  value: string;
  emphasis?: "default" | "success" | "warning" | "danger";
}

export interface ReportDetailRow {
  label: string;
  value: string;
}

export interface ReportTable {
  title: string;
  columns: string[];
  rows: string[][];
}

export interface ReportSection {
  id: string;
  title: string;
  narrative?: string[];
  metrics?: ReportMetric[];
  tables?: ReportTable[];
  detailRows?: ReportDetailRow[];
}

export interface ReportDocumentModel {
  organization: ReportOrganization;
  templateKey: ReportTemplateKey;
  kind: ReportDocumentKind;
  title: string;
  subtitle: string;
  generatedAt: string;
  sections: ReportSection[];
}
