import type {
  ReportDocumentModel,
  ReportSection,
  ReportTemplateKey,
} from "@/lib/reports/types";

export const dtiTemplate = {
  key: "dti" satisfies ReportTemplateKey,
  displayName: "DTI",
  buildSections(model: ReportDocumentModel): ReportSection[] {
    return model.kind === "admin_range"
      ? [
          {
            ...model.sections[0],
            id: "org-overview",
            title: "Market Service and Operations Overview",
          },
          ...model.sections.slice(1),
        ]
      : model.sections;
  },
};
