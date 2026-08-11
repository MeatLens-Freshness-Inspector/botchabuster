import { buildReportDocDefinition } from "@/lib/reports/pdf/buildDocDefinition";
import { loadPdfMake } from "@/lib/reports/pdf/runtime";
import type { ReportDocumentModel } from "@/features/reports/model/types";

export async function composeReportPdf(
  model: ReportDocumentModel,
  fileName: string,
): Promise<void> {
  const pdfMake = await loadPdfMake();
  const docDefinition = await buildReportDocDefinition(model);
  pdfMake.createPdf(docDefinition).download(fileName);
}
