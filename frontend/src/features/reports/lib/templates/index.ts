import { cityVetTemplate } from "./cityVetTemplate";
import { dtiTemplate } from "./dtiTemplate";
import { gcccsTemplate } from "./gcccsTemplate";
import type {
  ReportDocumentModel,
  ReportSection,
  ReportTemplateKey,
} from "@/features/reports/model/types";

export interface OrganizationReportTemplate {
  key: ReportTemplateKey;
  displayName: string;
  buildSections(model: ReportDocumentModel): ReportSection[];
}

export function getOrganizationReportTemplate(
  templateKey: ReportTemplateKey,
): OrganizationReportTemplate {
  if (templateKey === "gcccs") return gcccsTemplate;
  if (templateKey === "dti") return dtiTemplate;
  return cityVetTemplate;
}
