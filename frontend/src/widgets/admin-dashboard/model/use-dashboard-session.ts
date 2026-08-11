import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/entities/user";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import type { AdminDashboardTabKey } from "../model/types";
import {
  coerceAdminDashboardTab,
  getAdminDashboardTabs,
} from "../lib/dashboard";

export function useDashboardSession() {
  const { user, profile, isDeveloper } = useAuth();
  const isMobile = useIsMobile();
  const tabs = useMemo(() => getAdminDashboardTabs(isDeveloper), [isDeveloper]);
  const [activeTab, setActiveTab] = useState<AdminDashboardTabKey>("overview");

  useEffect(() => {
    setActiveTab((currentTab) => coerceAdminDashboardTab(currentTab, isDeveloper));
  }, [isDeveloper]);

  return {
    activeTab,
    isDeveloper,
    isMobile,
    profile,
    setActiveTab,
    tabs,
    user,
  };
}
