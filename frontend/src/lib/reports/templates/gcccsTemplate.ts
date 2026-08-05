import type {
  ReportDocumentModel,
  ReportSection,
  ReportTemplateKey,
} from "@/lib/reports/types";
import { reorderAdminSections } from "@/lib/reports/templates/adminSectionOrder";

export const gcccsTemplate = {
  key: "gcccs" satisfies ReportTemplateKey,
  displayName: "Gordon College CCS",
  buildSections(model: ReportDocumentModel): ReportSection[] {
    if (model.kind === "admin_range") {
      return reorderAdminSections(
        model.sections.filter((section) => section.id !== "pork-gallery"),
        ["org-overview", "report-graphs", "meat-summary", "meat-detail"],
      ).map((section) => {
        if (section.id === "org-overview") {
          return {
            ...section,
            title: "Technical and System Overview",
          };
        }

        if (section.id === "report-graphs") {
          return {
            ...section,
            title: "Technical Inspection Graphs",
          };
        }

        return section;
      });
    }

    if (model.kind === "inspector_daily") {
      return model.sections.map((section) => {
        if (section.id === "report-graphs") {
          return {
            ...section,
            title: "Technical Inspection Graphs",
          };
        }

        if (section.id === "meat-detail" && section.inspectionEvidence) {
          return {
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
          };
        }

        return section;
      });
    }

    return model.sections;
  },
};
