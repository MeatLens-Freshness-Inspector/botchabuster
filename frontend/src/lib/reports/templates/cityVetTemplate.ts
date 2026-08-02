import type {
  ReportDocumentModel,
  ReportSection,
  ReportTemplateKey,
} from "@/lib/reports/types";

export const cityVetTemplate = {
  key: "city_vet" satisfies ReportTemplateKey,
  displayName: "City Veterinary Office of Olongapo",
  buildSections(model: ReportDocumentModel): ReportSection[] {
    return model.kind === "admin_range"
      ? [
          {
            ...model.sections[0],
            id: "org-overview",
            title: "Veterinary and Meat Safety Overview",
          },
          ...model.sections.slice(1),
        ]
      : model.sections;
  },
};
