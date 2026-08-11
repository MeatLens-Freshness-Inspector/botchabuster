import {
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import AdminDashboardDialogs from "./AdminDashboardDialogs";
import AdminDashboardSummary from "./AdminDashboardSummary";
import { useAdminDashboardPage } from "../hooks/useAdminDashboardPage";
import type { AdminDashboardTabKey } from "../types";
import AccessCodesTab from "../mobile/components/AccessCodesTab";
import DeveloperTab from "../mobile/components/DeveloperTab";
import InspectionsTab from "../mobile/components/InspectionsTab";
import LogsTab from "../mobile/components/LogsTab";
import MarketsTab from "../mobile/components/MarketsTab";
import OverviewTab from "../mobile/components/OverviewTab";
import ReportsTab from "../mobile/components/ReportsTab";
import UsersTab from "../mobile/components/UsersTab";

function renderMobileTab(
  activeTab: AdminDashboardTabKey,
  dashboard: ReturnType<typeof useAdminDashboardPage>,
) {
  switch (activeTab) {
    case "overview":
      return <OverviewTab dashboard={dashboard} />;
    case "users":
      return <UsersTab dashboard={dashboard} />;
    case "inspections":
      return <InspectionsTab dashboard={dashboard} />;
    case "codes":
      return <AccessCodesTab dashboard={dashboard} />;
    case "markets":
      return <MarketsTab dashboard={dashboard} />;
    case "logs":
      return <LogsTab dashboard={dashboard} />;
    case "developer":
      return <DeveloperTab dashboard={dashboard} />;
    case "reports":
      return null;
  }
}

export default function AdminDashboardMobilePage() {
  const dashboard = useAdminDashboardPage();

  if (dashboard.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const {
    tabs,
    activeTab,
    activeTabConfig,
    setActiveTab,
  } = dashboard;
  const ActiveTabIcon = activeTabConfig.icon;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto w-full max-w-7xl min-w-0 px-4 pt-4">
        <AdminDashboardSummary dashboard={dashboard} />

        <section className="mt-4 rounded-3xl border border-border/70 bg-card/85 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="group flex w-full items-center justify-between rounded-2xl border border-primary/40 bg-[hsl(var(--primary)/0.16)] px-4 py-3 text-left transition-colors hover:bg-[hsl(var(--primary)/0.20)]"
              >
                <span className="flex items-center gap-2">
                  <ActiveTabIcon className="h-4 w-4 text-foreground" />
                  <span className="font-display text-sm uppercase tracking-wider text-foreground">
                    {activeTabConfig.label}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(100vw-2rem)] rounded-2xl border-border/70 bg-card/95 p-1"
            >
              {tabs.map(({ key, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => setActiveTab(key)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 font-display text-xs uppercase tracking-wider ${
                    activeTab === key
                      ? "bg-[hsl(var(--primary)/0.16)] text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </section>

        <div className="mt-4 space-y-4">{renderMobileTab(activeTab, dashboard)}</div>
      </div>

      {activeTab === "reports" ? <ReportsTab dashboard={dashboard} /> : null}

      <AdminDashboardDialogs dashboard={dashboard} />
    </div>
  );
}
