export const REPORT_ORGANIZATION_OPTIONS = [
  { value: "dti", label: "DTI" },
  {
    value: "city_veterinary_office_olongapo",
    label: "City Veterinary Office of Olongapo",
  },
  {
    value: "gordon_college_ccs",
    label: "Gordon College CCS",
  },
] as const;

export type ReportOrganization =
  (typeof REPORT_ORGANIZATION_OPTIONS)[number]["value"];

export const REPORT_ORGANIZATION_FALLBACK: ReportOrganization =
  "gordon_college_ccs";

const REPORT_ORGANIZATION_LABELS: Record<ReportOrganization, string> = {
  dti: "DTI",
  city_veterinary_office_olongapo: "City Veterinary Office of Olongapo",
  gordon_college_ccs: "Gordon College CCS",
};

const REPORT_ORGANIZATION_SET = new Set<string>(
  REPORT_ORGANIZATION_OPTIONS.map((option) => option.value),
);

export function isReportOrganization(
  value: unknown,
): value is ReportOrganization {
  return typeof value === "string" && REPORT_ORGANIZATION_SET.has(value);
}

export function resolveReportOrganization(
  value: unknown,
): ReportOrganization {
  return isReportOrganization(value)
    ? value
    : REPORT_ORGANIZATION_FALLBACK;
}

export function getReportOrganizationLabel(value: unknown): string {
  return REPORT_ORGANIZATION_LABELS[resolveReportOrganization(value)];
}
