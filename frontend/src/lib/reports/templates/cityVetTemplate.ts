import type {
  ReportDocumentModel,
  ReportSection,
  ReportTemplateKey,
} from "@/lib/reports/types";

export const cityVetTemplate = {
  key: "city_vet" satisfies ReportTemplateKey,
  displayName: "City Veterinary Office of Olongapo",
  buildSections(model: ReportDocumentModel): ReportSection[] {
    if (model.kind === "admin_range") {
      return [
        {
          ...model.sections[0],
          id: "org-overview",
          title: "Veterinary and Meat Safety Overview",
        },
        ...model.sections.slice(1),
      ];
    }

    if (model.kind === "inspector_daily") {
      return model.sections.map((section) =>
        section.id === "meat-detail"
          ? {
              ...section,
              title: "Veterinary Inspection Evidence",
              evidenceLayout: "photo-first",
            }
          : section,
      );
    }

    return model.sections;
  },
};
