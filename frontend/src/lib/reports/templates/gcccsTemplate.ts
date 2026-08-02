import type {
  ReportDocumentModel,
  ReportSection,
  ReportTemplateKey,
} from "@/lib/reports/types";

export const gcccsTemplate = {
  key: "gcccs" satisfies ReportTemplateKey,
  displayName: "Gordon College CCS",
  buildSections(model: ReportDocumentModel): ReportSection[] {
    return model.kind === "admin_range"
      ? [
          {
            ...model.sections[0],
            id: "org-overview",
            title: "Technical and System Overview",
          },
          ...model.sections.slice(1),
        ]
      : model.sections;
  },
};
