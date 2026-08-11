import { useMemo } from "react";
import type { Inspection } from "@/entities/inspection";
import type { Profile } from "@/entities/user/api";
import { getInspectorLabel } from "../lib/dashboard";
import { useInspectionPagination } from "./use-inspection-pagination";

export function useInspectionsTab(
  inspections: Inspection[],
  profileById: ReadonlyMap<string, Profile>,
) {
  const pagination = useInspectionPagination();
  const filteredInspections = useMemo(() => {
    const query = pagination.inspectorFilter.trim().toLowerCase();
    if (!query) return inspections;

    return inspections.filter((inspection) => {
      const profile = inspection.user_id ? profileById.get(inspection.user_id) : undefined;
      return getInspectorLabel(profile).toLowerCase().includes(query);
    });
  }, [inspections, pagination.inspectorFilter, profileById]);

  const totalInspectionPages = Math.max(
    1,
    Math.ceil(filteredInspections.length / pagination.inspectionPageSize),
  );
  const paginatedInspections = useMemo(() => {
    const safePage = Math.min(
      Math.max(1, pagination.inspectionPage),
      totalInspectionPages,
    );
    const start = (safePage - 1) * pagination.inspectionPageSize;
    return filteredInspections.slice(start, start + pagination.inspectionPageSize);
  }, [filteredInspections, pagination.inspectionPage, pagination.inspectionPageSize, totalInspectionPages]);

  return {
    ...pagination,
    filteredInspections,
    paginatedInspections,
    totalInspectionPages,
  };
}
