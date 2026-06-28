import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminDashboardDialogs from "./AdminDashboardDialogs";
import { useAdminDashboardPage } from "../hooks/useAdminDashboardPage";
import type { AdminDashboardTabKey } from "../types";
import AccessCodesTab from "../desktop/components/AccessCodesTab";
import DeveloperTab from "../desktop/components/DeveloperTab";
import InspectionsTab from "../desktop/components/InspectionsTab";
import LogsTab from "../desktop/components/LogsTab";
import MarketsTab from "../desktop/components/MarketsTab";
import OverviewTab from "../desktop/components/OverviewTab";
import ReportsTab from "../desktop/components/ReportsTab";
import UsersTab from "../desktop/components/UsersTab";

function renderDesktopTab(
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
    case "reports":
      return <ReportsTab dashboard={dashboard} />;
    case "logs":
      return <LogsTab dashboard={dashboard} />;
    case "developer":
      return <DeveloperTab dashboard={dashboard} />;
  }
}

export default function AdminDashboardDesktopPage() {
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
    stats,
    avgConfidence,
    spoiledRate,
    recentTrend,
    setActiveTab,
    handleRefresh,
  } = dashboard;
  const ActiveTabIcon = activeTabConfig.icon;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]">
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-60 flex-shrink-0 border-r border-border/70 bg-card/95">
          <div className="flex h-16 items-center border-b border-border/70 px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-[hsl(var(--primary)/0.15)]">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <span className="ml-3 font-display text-base font-semibold tracking-tight">
              MeatLens
            </span>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  activeTab === key
                    ? "bg-[hsl(var(--primary)/0.16)] text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border/70 bg-card/95 px-6">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-xl font-semibold tracking-tight">
                Admin Dashboard
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                <ActiveTabIcon className="h-3.5 w-3.5" />
                {activeTabConfig.label}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2 rounded-xl"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-6 pb-24">
            <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6">
              <section className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-[0_24px_70px_-34px_rgba(0,0,0,0.65)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.15)]">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h1 className="font-display text-xl font-semibold tracking-tight">
                        Admin Dashboard
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        System management and analytics hub
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    className="gap-2 rounded-xl"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Total Users
                    </p>
                    <p className="mt-1 font-display text-3xl font-semibold">
                      {stats?.total_users || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)] p-3">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Total Inspections
                    </p>
                    <p className="mt-1 font-display text-3xl font-semibold">
                      {stats?.total_inspections || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Avg Confidence
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="font-display text-3xl font-semibold">
                        {avgConfidence}%
                      </p>
                      <CheckCircle className="h-4 w-4 text-fresh" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Spoiled Rate
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="font-display text-3xl font-semibold">
                        {spoiledRate}%
                      </p>
                      {spoiledRate > 20 ? (
                        <AlertTriangle className="h-4 w-4 text-spoiled" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-fresh" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-border/70 bg-background/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        7-Day Movement vs Previous Week
                      </p>
                      <p className="font-display text-lg font-semibold">
                        {recentTrend >= 0 ? "+" : ""}
                        {recentTrend}% inspections
                      </p>
                    </div>
                    {recentTrend >= 0 ? (
                      <TrendingUp className="h-8 w-8 text-fresh" />
                    ) : (
                      <TrendingDown className="h-8 w-8 text-warning" />
                    )}
                  </div>
                </div>
              </section>

              <div className="mt-4 space-y-4">
                {renderDesktopTab(activeTab, dashboard)}
              </div>
            </div>
          </main>
        </div>
      </div>

      <AdminDashboardDialogs dashboard={dashboard} />
    </div>
  );
}
