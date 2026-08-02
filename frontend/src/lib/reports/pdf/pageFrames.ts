import { getReportFrameAssetPath } from "@/lib/reports/pdf/assets";
import type { ReportTemplateKey } from "@/lib/reports/types";

export interface ReportPageFrame {
  backgroundAssetPath: string;
  pageMargins: [number, number, number, number];
  sectionColor: string;
  bodyColor: string;
  tableHeaderFillColor: string;
  tableHeaderTextColor: string;
  pageNumberColor: string;
}

const REPORT_PAGE_FRAMES: Record<ReportTemplateKey, Omit<ReportPageFrame, "backgroundAssetPath">> =
  {
    gcccs: {
      pageMargins: [52, 172, 52, 78],
      sectionColor: "#111827",
      bodyColor: "#334155",
      tableHeaderFillColor: "#E5E7EB",
      tableHeaderTextColor: "#111827",
      pageNumberColor: "#334155",
    },
    dti: {
      pageMargins: [58, 142, 58, 70],
      sectionColor: "#1D4ED8",
      bodyColor: "#334155",
      tableHeaderFillColor: "#DBEAFE",
      tableHeaderTextColor: "#1E3A8A",
      pageNumberColor: "#1E3A8A",
    },
    city_vet: {
      pageMargins: [58, 148, 58, 70],
      sectionColor: "#166534",
      bodyColor: "#334155",
      tableHeaderFillColor: "#DCFCE7",
      tableHeaderTextColor: "#14532D",
      pageNumberColor: "#14532D",
    },
  };

export function getReportPageFrame(
  templateKey: ReportTemplateKey,
): ReportPageFrame {
  return {
    backgroundAssetPath: getReportFrameAssetPath(templateKey),
    ...REPORT_PAGE_FRAMES[templateKey],
  };
}
