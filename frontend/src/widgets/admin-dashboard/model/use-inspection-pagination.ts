import { useEffect, useState } from "react";

const INSPECTION_PAGE_SIZE = 10;

export function useInspectionPagination() {
  const [inspectorFilter, setInspectorFilter] = useState("");
  const [inspectionPage, setInspectionPage] = useState(1);

  useEffect(() => {
    setInspectionPage(1);
  }, [inspectorFilter]);

  return {
    inspectionPage,
    inspectionPageSize: INSPECTION_PAGE_SIZE,
    inspectorFilter,
    setInspectionPage,
    setInspectorFilter,
  };
}
