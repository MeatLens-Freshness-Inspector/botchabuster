import type { FreshnessClassification } from "@/entities/inspection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import type { AdminDashboardPageViewModel } from "../../model/use-admin-dashboard";
import { PIE_COLORS } from "../../lib/dashboard";

type SummaryCardsProps = { dashboard: AdminDashboardPageViewModel };

export function SummaryCards({ dashboard }: SummaryCardsProps) {
  const { chartConfig, dailyInspections, pieData, classificationCounts, inspections, stats } = dashboard;

  return (
    <>
      <section className="rounded-[32px] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)/0.96),hsl(var(--background)/0.2))] p-5 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.65)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Overview</p>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Operational trends and risk hotspots</h2>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">Compare inspection volume, classification mix, and confidence stability in one view.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="rounded-full border border-border/70 bg-background/60 px-3 py-1.5">14-day volume</span>
            <span className="rounded-full border border-border/70 bg-background/60 px-3 py-1.5">Classification mix</span>
            <span className="rounded-full border border-border/70 bg-background/60 px-3 py-1.5">Location risk</span>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="min-w-0 rounded-[32px] border-border/70 bg-card/95 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.55)]">
          <CardHeader className="space-y-2"><CardTitle className="text-base font-semibold tracking-tight">Daily inspections</CardTitle><CardDescription>Inspection volume over the last 14 days.</CardDescription></CardHeader>
          <CardContent><ChartContainer config={chartConfig} className="h-[260px] w-full min-w-0"><AreaChart data={dailyInspections}><CartesianGrid strokeDasharray="3 3" className="stroke-border/50" /><XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" /><ChartTooltip content={<ChartTooltipContent />} /><Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" /></AreaChart></ChartContainer></CardContent>
        </Card>
        <Card className="min-w-0 rounded-[32px] border-border/70 bg-card/95 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.55)]">
          <CardHeader className="space-y-2"><CardTitle className="text-base font-semibold tracking-tight">Classification distribution</CardTitle><CardDescription>Share of inspections across the current freshness categories.</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full min-w-0"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3}>{pieData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}</Pie><ChartTooltip content={<ChartTooltipContent />} /></PieChart></ChartContainer>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5">{(["fresh", "not fresh", "acceptable", "warning", "spoiled"] as FreshnessClassification[]).map((classification) => { const count = classificationCounts[classification] || 0; const percentage = inspections.length > 0 ? (count / inspections.length) * 100 : 0; return <div key={classification} className="group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-background/50 p-2.5 transition-all hover:border-border hover:bg-background/80 sm:p-3" title={classification}><div className="flex items-center gap-1.5 min-w-0"><span className="h-2 w-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: PIE_COLORS[classification] }} /><span className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{classification}</span></div><div className="mt-2 flex items-baseline justify-between gap-1"><span className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">{count}</span><span className="text-[11px] font-medium text-muted-foreground">{percentage.toFixed(0)}%</span></div></div>; })}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[32px] border-border/70 bg-card/95 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.45)]">
        <CardHeader className="space-y-2"><CardTitle className="text-base font-semibold tracking-tight">Classification breakdown</CardTitle><CardDescription>A quick scan of how the current inspection set is distributed.</CardDescription></CardHeader>
        <CardContent className="space-y-3">{(["fresh", "not fresh", "acceptable", "warning", "spoiled"] as FreshnessClassification[]).map((classification) => { const count = classificationCounts[classification] || 0; const percentage = inspections.length > 0 ? (count / inspections.length) * 100 : 0; return <div key={classification}><div className="mb-1 flex items-center justify-between"><span className="flex items-center gap-1.5 font-display text-xs uppercase tracking-wider"><span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[classification] }} />{classification}</span><span className="font-display text-xs text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span></div><div className="h-2 w-full overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: PIE_COLORS[classification] }} /></div></div>; })}</CardContent>
      </Card>

      {stats?.roles ? <Card className="rounded-[32px] border-border/70 bg-card/95 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.45)]">
        <CardHeader className="space-y-2"><CardTitle className="text-base font-semibold tracking-tight">Users by role</CardTitle><CardDescription>Current account distribution across dashboard roles.</CardDescription></CardHeader>
        <CardContent><div className="grid gap-3 sm:grid-cols-3">{stats.roles.map((roleStat) => <div key={roleStat.role} className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-background/50 p-3 transition-colors hover:bg-background/80 sm:p-4"><p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{roleStat.role}</p><p className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground">{roleStat.count}</p></div>)}</div></CardContent>
      </Card> : null}
    </>
  );
}
