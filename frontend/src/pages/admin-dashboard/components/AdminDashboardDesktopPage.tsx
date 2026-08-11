import {
  Loader2,
  ShieldCheck,
} from "lucide-react";
import AdminDashboardDialogs from "./AdminDashboardDialogs";
import AdminDashboardSummary from "./AdminDashboardSummary";
import { useAdminDashboardPage } from "../hooks/useAdminDashboardPage";
import type { AdminDashboardTabKey } from "@/widgets/admin-dashboard";
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
    setActiveTab,
  } = dashboard;
  const ActiveTabIcon = activeTabConfig.icon;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-16">
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 flex-shrink-0 border-r border-border/70 bg-card/95">
          <div className="flex h-16 items-center border-b border-border/70 px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-[hsl(var(--primary)/0.15)]">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-3">
              <span className="block font-display text-base font-semibold tracking-tight">
                MeatLens
              </span>
              <span className="block text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Admin workspace
              </span>
            </div>
          </div>
          <nav className="flex flex-col gap-1.5 p-3">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all ${
                  activeTab === key
                    ? "border-primary/40 bg-[hsl(var(--primary)/0.16)] text-foreground shadow-[0_12px_32px_-20px_rgba(0,0,0,0.75)]"
                    : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-secondary/60 hover:text-foreground"
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
          </header>

          <main className="flex-1 overflow-auto p-6 pb-20">
            <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6">
              <AdminDashboardSummary dashboard={dashboard} />

              <div className="space-y-4">
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
