import {
  loadOptionalReportImageAsset,
  loadReportBrandAsset,
} from "@/lib/reports/pdf/assets";
import { getReportPageFrame } from "@/features/reports/lib/page-frames";
import { buildReportDocumentHeader } from "@/features/reports/lib/pdf/document-header";
import { buildReportDocumentSections } from "@/features/reports/lib/pdf/document-sections";
import { getOrganizationReportTemplate } from "@/features/reports/lib/templates";
import type { ReportDocumentModel } from "@/features/reports/model/types";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

export interface BuildReportDocDefinitionDependencies {
  loadBrandAsset?: (path: string) => Promise<string>;
  loadInspectionImageAsset?: (path: string | null | undefined) => Promise<string | null>;
}

export async function buildReportDocDefinition(
  model: ReportDocumentModel,
  dependencies: BuildReportDocDefinitionDependencies = {},
): Promise<TDocumentDefinitions> {
  const template = getOrganizationReportTemplate(model.templateKey);
  const sections = template.buildSections(model);
  const frame = getReportPageFrame(model.templateKey);
  const loadBrandAsset = dependencies.loadBrandAsset ?? loadReportBrandAsset;
  const loadInspectionImageAsset = dependencies.loadInspectionImageAsset ?? loadOptionalReportImageAsset;
  const frameImage = await loadBrandAsset(frame.backgroundAssetPath);
  const header = buildReportDocumentHeader(model, template, { ...frame, backgroundAssetPath: frameImage });

  return {
    ...header,
    content: await buildReportDocumentSections(
      model,
      sections,
      frame.sectionColor,
      frame,
      loadInspectionImageAsset,
    ),
  } as TDocumentDefinitions;
}
