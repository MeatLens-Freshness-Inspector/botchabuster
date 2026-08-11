import { useState } from "react";
import type { DeveloperOverviewMetricPoint } from "@/entities/developer-metrics";
import type { RoleStat } from "../model/types";

export type AdminDashboardStats = {
  total_users: number;
  total_inspections: number;
  roles: RoleStat[] | null;
};

export function useOverviewTab() {
  const [developerLatestRuns, setDeveloperLatestRuns] = useState<DeveloperOverviewMetricPoint[]>([]);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);

  return {
    developerLatestRuns,
    setDeveloperLatestRuns,
    setStats,
    stats,
  };
}
