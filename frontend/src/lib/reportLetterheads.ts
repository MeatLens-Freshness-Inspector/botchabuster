import {
  resolveReportOrganization,
  type ReportOrganization,
} from "@/lib/reportOrganizations";

const REPORT_LETTERHEAD_FILES: Record<ReportOrganization, string> = {
  dti: "DTI zambales letterhead.pdf",
  city_veterinary_office_olongapo: "City Vet letterhead.pdf",
  gordon_college_ccs: "gcccs letterhead new.pdf",
};

export function getReportLetterheadAssetPath(value: unknown): string {
  const organization = resolveReportOrganization(value);
  return `/letterheads/${REPORT_LETTERHEAD_FILES[organization]}`;
}

export function getReportLetterheadAssetUrl(
  value: unknown,
  origin = "http://localhost",
): string {
  return new URL(getReportLetterheadAssetPath(value), origin).toString();
}
