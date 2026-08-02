import { resolveReportOrganization } from "@/lib/reportOrganizations";
import type { ReportTemplateKey } from "@/lib/reports/types";

export function getTemplateKeyForOrganization(
  value: unknown,
): ReportTemplateKey {
  const organization = resolveReportOrganization(value);

  if (organization === "gordon_college_ccs") return "gcccs";
  if (organization === "dti") return "dti";
  return "city_vet";
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
