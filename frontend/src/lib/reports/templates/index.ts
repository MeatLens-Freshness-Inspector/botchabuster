import { cityVetTemplate } from "@/lib/reports/templates/cityVetTemplate";
import { dtiTemplate } from "@/lib/reports/templates/dtiTemplate";
import { gcccsTemplate } from "@/lib/reports/templates/gcccsTemplate";
import type {
  ReportDocumentModel,
  ReportSection,
  ReportTemplateKey,
} from "@/lib/reports/types";

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
