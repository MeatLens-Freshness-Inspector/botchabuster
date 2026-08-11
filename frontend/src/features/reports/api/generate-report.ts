import { buildReportDocDefinition } from "../lib/pdf/build-doc-definition";
import { loadPdfMake } from "../lib/pdf/runtime";
import type { ReportDocumentModel } from "@/features/reports/model/types";

export async function generateReport(
  model: ReportDocumentModel,
  fileName: string,
): Promise<void> {
  const pdfMake = await loadPdfMake();
  const docDefinition = await buildReportDocDefinition(model);
  pdfMake.createPdf(docDefinition).download(fileName);
}

export const composeReportPdf = generateReport;
