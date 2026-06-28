export const REPORT_ORGANIZATIONS = [
  "dti",
  "city_veterinary_office_olongapo",
  "gordon_college_ccs",
] as const;

export type ReportOrganization = (typeof REPORT_ORGANIZATIONS)[number];

export const LEGACY_REPORT_ORGANIZATION_FALLBACK: ReportOrganization =
  "gordon_college_ccs";

const REPORT_ORGANIZATION_LABELS: Record<ReportOrganization, string> = {
  dti: "DTI",
  city_veterinary_office_olongapo: "City Veterinary Office of Olongapo",
  gordon_college_ccs: "Gordon College CCS",
};

const REPORT_ORGANIZATION_SET = new Set<string>(REPORT_ORGANIZATIONS);

export function isReportOrganization(
  value: unknown,
): value is ReportOrganization {
  return typeof value === "string" && REPORT_ORGANIZATION_SET.has(value);
}

export function requireReportOrganization(value: unknown): ReportOrganization {
  if (isReportOrganization(value)) {
    return value;
  }

  throw new Error(
    "Report organization must be one of: dti, city_veterinary_office_olongapo, gordon_college_ccs",
  );
}

export function resolveReportOrganization(
  value: unknown,
): ReportOrganization {
  return isReportOrganization(value)
    ? value
    : LEGACY_REPORT_ORGANIZATION_FALLBACK;
}

export function getReportOrganizationLabel(value: unknown): string {
  return REPORT_ORGANIZATION_LABELS[resolveReportOrganization(value)];
}
