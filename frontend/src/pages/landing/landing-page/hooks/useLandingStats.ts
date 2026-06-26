import { useEffect, useMemo, useState } from "react";
import { statsClient } from "@/integrations/api";
import type { AnimatedStatData } from "../../types";

export function useLandingStats() {
  const [inspectionCount, setInspectionCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [freshRate, setFreshRate] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchStats() {
      try {
        const stats = await statsClient.getLandingPageStats();
        if (!mounted) return;

        setInspectionCount(stats.inspectionCount);
        setUserCount(stats.userCount);
        setFreshRate(stats.freshRate);
      } catch (error) {
        console.error("Failed to fetch landing stats:", error);
      }
    }

    void fetchStats();

    return () => {
      mounted = false;
    };
  }, []);

  const statCards = useMemo<AnimatedStatData[]>(
    () => [
      { rawValue: userCount, suffix: "", label: "Registered Inspectors" },
      { rawValue: inspectionCount, suffix: "", label: "Completed Inspections" },
      { rawValue: freshRate, suffix: "%", label: "Average Fresh Detection" },
    ],
    [freshRate, inspectionCount, userCount],
  );

  return { statCards };
}
