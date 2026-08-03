import type {
  ReportDocumentModel,
  ReportSection,
  ReportTemplateKey,
} from "@/lib/reports/types";
import { reorderAdminSections } from "@/lib/reports/templates/adminSectionOrder";

export const dtiTemplate = {
  key: "dti" satisfies ReportTemplateKey,
  displayName: "DTI",
  buildSections(model: ReportDocumentModel): ReportSection[] {
    if (model.kind === "admin_range") {
      return reorderAdminSections(model.sections, [
        "org-overview",
        "report-graphs",
        "pork-gallery",
        "meat-summary",
        "meat-detail",
      ]).map((section) => {
        if (section.id === "org-overview") {
          return {
            ...section,
            title: "Market Service and Operations Overview",
          };
        }

        if (section.id === "report-graphs") {
          return {
            ...section,
            title: "Operational Inspection Graphs",
          };
        }

        if (section.id === "pork-gallery") {
          return {
            ...section,
            title: "Pork Meat Field Evidence",
          };
        }

        return section;
      });
    }

    if (model.kind === "inspector_daily") {
      return model.sections.map((section) =>
        section.id === "meat-detail"
          ? {
              ...section,
              title: "Market Field Inspection Evidence",
              evidenceLayout: "photo-first",
            }
          : section,
      );
    }

    return model.sections;
  },
};
