import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/entities/user";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import type { AdminDashboardTabKey } from "../model/types";
import {
  coerceAdminDashboardTab,
  getAdminDashboardTabs,
} from "../lib/dashboard";

export function useDashboardSession() {
  const { user, profile, isAdmin, isDeveloper } = useAuth();
  const isMobile = useIsMobile();
  const tabs = useMemo(() => getAdminDashboardTabs(isDeveloper), [isDeveloper]);
  const [activeTab, setActiveTab] = useState<AdminDashboardTabKey>("overview");

  useEffect(() => {
    setActiveTab((currentTab) => coerceAdminDashboardTab(currentTab, isDeveloper));
  }, [isDeveloper]);

  return {
    activeTab,
    isDeveloper,
    isAdmin,
    isMobile,
    profile,
    setActiveTab,
    tabs,
    user,
  };
}
