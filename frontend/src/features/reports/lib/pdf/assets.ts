import { resolveReportOrganization } from "../../model/organizations";
import type { ReportTemplateKey } from "@/features/reports/model/types";

const REPORT_TEMPLATE_FRAME_ASSET_PATHS: Record<ReportTemplateKey, string> = {
  gcccs: "/letterheads/rendered/gcccs-page.png",
  dti: "/letterheads/rendered/dti-page.png",
  city_vet: "/letterheads/rendered/city-vet-page.png",
};

export type ReportInspectionImageLoader = (
  path: string | null | undefined,
) => Promise<string | null>;

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

async function readReportAssetAsDataUrl(path: string): Promise<string> {
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

export async function loadReportBrandAsset(path: string): Promise<string> {
  return readReportAssetAsDataUrl(path);
}

export async function loadOptionalReportImageAsset(
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;

  try {
    return await readReportAssetAsDataUrl(path);
  } catch {
    return null;
  }
}

export function createReportInspectionImageLoader(
  loadAsset: ReportInspectionImageLoader = loadOptionalReportImageAsset,
  concurrency = 6,
): ReportInspectionImageLoader {
  const cache = new Map<string, Promise<string | null>>();
  const pending: Array<{
    path: string;
    resolve: (value: string | null) => void;
  }> = [];
  let active = 0;
  const workerLimit = Math.max(1, Math.trunc(concurrency));

  const pump = (): void => {
    while (active < workerLimit && pending.length > 0) {
      const next = pending.shift();
      if (!next) return;

      active += 1;
      void Promise.resolve(loadAsset(next.path))
        .then(next.resolve, () => next.resolve(null))
        .finally(() => {
          active -= 1;
          pump();
        });
    }
  };

  return (path) => {
    if (!path) return Promise.resolve(null);

    const cached = cache.get(path);
    if (cached) return cached;

    const result = new Promise<string | null>((resolve) => {
      pending.push({ path, resolve });
      pump();
    });
    cache.set(path, result);
    return result;
  };
}
