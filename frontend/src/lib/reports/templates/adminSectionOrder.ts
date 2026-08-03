import type { ReportSection } from "@/lib/reports/types";

export function reorderAdminSections(
  sections: ReportSection[],
  order: string[],
): ReportSection[] {
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const orderedSections = order
    .map((id) => sectionById.get(id))
    .filter((section): section is ReportSection => !!section);
  const orderedIds = new Set(orderedSections.map((section) => section.id));

  return [
    ...orderedSections,
    ...sections.filter((section) => !orderedIds.has(section.id)),
  ];
}
