import React from "react";
import { format, isValid } from "date-fns";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import type { DisputeDailyTrend, DisputeStatusCount } from "../model/dispute-analytics";
import { ADMIN_DASHBOARD_CHART_CONFIG, PIE_COLORS } from "../lib/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";

function statusLabel(status: DisputeStatusCount["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function trendLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return isValid(parsed) ? format(parsed, "MMM d") : date;
}

export type DisputeChartsProps = {
  statusDistribution: DisputeStatusCount[];
  dailyTrend: DisputeDailyTrend[];
};

export function DisputeCharts({ statusDistribution, dailyTrend }: DisputeChartsProps) {
  const chartStatusData = statusDistribution.map((entry) => ({
    ...entry,
    name: statusLabel(entry.status),
  }));
  const chartTrendData = dailyTrend.map((entry) => ({
    ...entry,
    label: trendLabel(entry.date),
  }));
  const hasData = statusDistribution.some(({ count }) => count > 0) || dailyTrend.length > 0;

  if (!hasData) {
    return (
      <Card className="rounded-[32px] border-border/70 bg-card/95">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No dispute activity in this period.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <Card className="min-w-0 rounded-[32px] border-border/70 bg-card/95">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base font-semibold tracking-tight">Disputes by status</CardTitle>
          <CardDescription>Current resolution mix across the dispute history.</CardDescription>
        </CardHeader>
        <CardContent>
          {statusDistribution.some(({ count }) => count > 0) ? (
            <ChartContainer config={ADMIN_DASHBOARD_CHART_CONFIG} className="h-[230px] w-full min-w-0">
              <BarChart data={chartStatusData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {chartStatusData.map((entry) => (
                    <Cell key={entry.status} fill={PIE_COLORS[entry.status]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No status data in this period.</p>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 rounded-[32px] border-border/70 bg-card/95">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base font-semibold tracking-tight">Disputes over time</CardTitle>
          <CardDescription>Disputes grouped by the day they were submitted.</CardDescription>
        </CardHeader>
        <CardContent>
          {chartTrendData.length > 0 ? (
            <ChartContainer config={ADMIN_DASHBOARD_CHART_CONFIG} className="h-[230px] w-full min-w-0">
              <BarChart data={chartTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No daily dispute data in this period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
