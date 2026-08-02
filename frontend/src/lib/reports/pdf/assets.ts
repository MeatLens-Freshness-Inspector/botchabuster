import { resolveReportOrganization } from "@/lib/reportOrganizations";
import type { ReportTemplateKey } from "@/lib/reports/types";

const REPORT_TEMPLATE_FRAME_ASSET_PATHS: Record<ReportTemplateKey, string> = {
  gcccs: "/letterheads/rendered/gcccs-page.png",
  dti: "/letterheads/rendered/dti-page.png",
  city_vet: "/letterheads/rendered/city-vet-page.png",
};

export function getTemplateKeyForOrganization(
  value: unknown,
): ReportTemplateKey {
  const organization = resolveReportOrganization(value);

  if (organization === "gordon_college_ccs") return "gcccs";
  if (organization === "dti") return "dti";
  return "city_vet";
}

export function getReportFrameAssetPath(
  templateKey: ReportTemplateKey,
): string {
  return REPORT_TEMPLATE_FRAME_ASSET_PATHS[templateKey];
}

export async function loadReportBrandAsset(path: string): Promise<string> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load report asset: ${path}`);
  }

  const blob = await response.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error(`Failed to read report asset: ${path}`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}
