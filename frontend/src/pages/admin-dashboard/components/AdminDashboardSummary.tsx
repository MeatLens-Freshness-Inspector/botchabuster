import {
  AlertTriangle,
  CheckCircle,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/shared/ui";
import type { AdminDashboardPageViewModel } from "../hooks/useAdminDashboardPage";

type AdminDashboardSummaryProps = {
  dashboard: AdminDashboardPageViewModel;
};

function SummaryMetric({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "warning" | "primary" | "surface";
  icon: ComponentType<{ className?: string }>;
}) {
  const toneClass =
    tone === "warning"
      ? "border-border/70 bg-[hsl(var(--warning)/0.16)]"
      : tone === "primary"
        ? "border-border/70 bg-[hsl(var(--primary)/0.16)]"
        : "border-border/70 bg-background/65";

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="font-display text-3xl font-semibold tracking-tight">
          {value}
        </p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

export default function AdminDashboardSummary({
  dashboard,
}: AdminDashboardSummaryProps) {
  const {
    activeTabConfig,
    stats,
    avgConfidence,
    spoiledRate,
    handleRefresh,
  } = dashboard;
  const ActiveTabIcon = activeTabConfig.icon;

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-border/70 bg-card/90 p-5 shadow-[0_28px_80px_-44px_rgba(0,0,0,0.72)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_30%),linear-gradient(135deg,hsl(var(--background)/0.08),transparent_55%)]" />

      <div className="relative space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>{activeTabConfig.label}</span>
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                Admin Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                System management and analytics hub.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2 rounded-xl border-border/70 bg-background/60"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric
            label="Total Users"
            value={String(stats?.total_users ?? 0)}
            tone="warning"
            icon={CheckCircle}
          />
          <SummaryMetric
            label="Total Inspections"
            value={String(stats?.total_inspections ?? 0)}
            tone="primary"
            icon={ShieldCheck}
          />
          <SummaryMetric
            label="Avg Confidence"
            value={`${avgConfidence}%`}
            tone="surface"
            icon={CheckCircle}
          />
          <SummaryMetric
            label="Spoiled Rate"
            value={`${spoiledRate}%`}
            tone="surface"
            icon={spoiledRate > 20 ? AlertTriangle : CheckCircle}
          />
        </div>
      </div>
    </section>
  );
}
