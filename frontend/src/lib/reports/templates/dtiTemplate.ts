import type {
  ReportDocumentModel,
  ReportSection,
  ReportTemplateKey,
} from "@/lib/reports/types";

export const dtiTemplate = {
  key: "dti" satisfies ReportTemplateKey,
  displayName: "DTI",
  buildSections(model: ReportDocumentModel): ReportSection[] {
    if (model.kind === "admin_range") {
      return [
        {
          ...model.sections[0],
          id: "org-overview",
          title: "Market Service and Operations Overview",
        },
        ...model.sections.slice(1),
      ];
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
