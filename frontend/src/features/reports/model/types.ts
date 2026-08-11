export type ReportOrganization =
  | "dti"
  | "city_veterinary_office_olongapo"
  | "gordon_college_ccs";

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

export interface ReportChartPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ReportChart {
  id: string;
  title: string;
  kind: "bar" | "line";
  orientation?: "vertical" | "horizontal";
  points: ReportChartPoint[];
  series?: Array<{
    name: string;
    points: ReportChartPoint[];
    color?: string;
  }>;
  emptyState: string;
  rotateLabels?: boolean;
}

export interface ReportInspectionEvidenceItem {
  id: string;
  imageUrl: string | null;
  capturedAt: string;
  meatType: string;
  classification: string;
  confidenceLabel: string;
  location: string;
  inspectorLabel?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  narrative?: string[];
  metrics?: ReportMetric[];
  tables?: ReportTable[];
  detailRows?: ReportDetailRow[];
  charts?: ReportChart[];
  inspectionEvidence?: ReportInspectionEvidenceItem[];
  evidenceLayout?: "photo-first";
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
