import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DeveloperOverviewMetricPoint, DeveloperOverviewResponse } from "@/integrations/api/DeveloperDashboardClient";

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value * 1000) / 10}%`;
}

function MetricCard({ label, value }: { label: string; value: number | null | undefined }) {
  const percent = typeof value === "number" && Number.isFinite(value) ? Math.round(value * 100) : 0;

  return (
    <Card className="border-border/70 bg-card/90">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <p className="font-display text-3xl font-semibold">{formatPercent(value)}</p>
        <Progress value={percent} className="h-2" />
      </CardContent>
    </Card>
  );
}

function RunSummaryCard({ title, run }: { title: string; run: DeveloperOverviewMetricPoint | null }) {
  return (
    <Card className="border-border/70 bg-card/90">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="outline">{run ? run.modelVersion : "No run"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {run ? (
          <>
            <div>
              <p className="font-display text-xl font-semibold">{run.modelVariant}</p>
              <p className="text-sm text-muted-foreground">{run.datasetName}</p>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <span>Accuracy {formatPercent(run.accuracy)}</span>
              <span>Precision {formatPercent(run.precision)}</span>
              <span>Recall {formatPercent(run.recall)}</span>
              <span>F1 {formatPercent(run.f1Score)}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No imported run results yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function DeveloperOverviewSection({
  overview,
  isLoading,
}: {
  overview: DeveloperOverviewResponse | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="border-border/70 bg-card/90">
        <CardContent className="p-6 text-sm text-muted-foreground">Loading developer metrics...</CardContent>
      </Card>
    );
  }

  const mobilenetv2 = overview?.highlightedFamilies.mobilenetv2 ?? null;
  const mobilenetv3 = overview?.highlightedFamilies.mobilenetv3 ?? null;
  const preferredRun = mobilenetv3 ?? mobilenetv2;
  const chartData = (overview?.latestRuns ?? []).map((run) => ({
    name: run.modelFamily,
    accuracy: Math.round(run.accuracy * 1000) / 10,
    precision: Math.round(run.precision * 1000) / 10,
    recall: Math.round(run.recall * 1000) / 10,
    f1: Math.round(run.f1Score * 1000) / 10,
  }));

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Model Overview</h2>
          <p className="text-sm text-muted-foreground">Imported run metrics for MobileNet model families.</p>
        </div>
        <Badge className="gap-1.5" variant="outline">
          <Activity className="h-3.5 w-3.5" />
          {overview?.latestRuns.length ?? 0} imported runs
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Accuracy" value={preferredRun?.accuracy} />
        <MetricCard label="Precision" value={preferredRun?.precision} />
        <MetricCard label="Recall" value={preferredRun?.recall} />
        <MetricCard label="F1 Score" value={preferredRun?.f1Score} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RunSummaryCard title="MobileNetV2" run={mobilenetv2} />
        <RunSummaryCard title="MobileNetV3" run={mobilenetv3} />
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Imported Run Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {chartData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="accuracy" fill="hsl(var(--primary))" name="Accuracy" />
                  <Bar dataKey="precision" fill="hsl(var(--fresh))" name="Precision" />
                  <Bar dataKey="recall" fill="hsl(var(--warning))" name="Recall" />
                  <Bar dataKey="f1" fill="hsl(var(--spoiled))" name="F1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No imported run metrics available.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
