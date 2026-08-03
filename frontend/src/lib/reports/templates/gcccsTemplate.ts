import type {
  ReportDocumentModel,
  ReportSection,
  ReportTemplateKey,
} from "@/lib/reports/types";

export const gcccsTemplate = {
  key: "gcccs" satisfies ReportTemplateKey,
  displayName: "Gordon College CCS",
  buildSections(model: ReportDocumentModel): ReportSection[] {
    if (model.kind === "admin_range") {
      return [
        {
          ...model.sections[0],
          id: "org-overview",
          title: "Technical and System Overview",
        },
        ...model.sections.slice(1),
      ];
    }

    if (model.kind === "inspector_daily") {
      return model.sections.map((section) =>
        section.id === "meat-detail" && section.inspectionEvidence
          ? {
              ...section,
              title: "Technical Inspection Evidence Log",
              inspectionEvidence: undefined,
              tables: [
                {
                  title: "Technical Inspection Evidence Log",
                  columns: [
                    "Captured",
                    "Meat",
                    "Classification",
                    "Confidence",
                    "Location",
                  ],
                  rows: section.inspectionEvidence.map((item) => [
                    item.capturedAt,
                    item.meatType,
                    item.classification,
                    item.confidenceLabel,
                    item.location,
                  ]),
                },
              ],
            }
          : section,
      );
    }

    return model.sections;
  },
};
