import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BarChart3, CheckCircle2, Crosshair, Layers, Scale, Sparkles, Target, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  DeveloperOverviewMetricPoint,
  DeveloperOverviewResponse,
  InAppModelMetrics,
} from "@/integrations/api/DeveloperDashboardClient";

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${Math.round(value * 1000) / 10}%`;
}

function InAppMetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  highlight = false,
}: {
  label: string;
  value: number | null | undefined;
  subtext?: string;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  const percent = typeof value === "number" && Number.isFinite(value) ? Math.round(value * 100) : 0;

  return (
    <Card className={`border-border/70 bg-card/90 transition-all hover:shadow-md ${highlight ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </CardTitle>
          <div className={`rounded-xl p-2 ${highlight ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-3xl font-bold tracking-tight">{formatPercent(value)}</p>
          {subtext && <span className="text-xs text-muted-foreground">{subtext}</span>}
        </div>
        <Progress value={percent} className={`h-2.5 rounded-full ${highlight ? "[&>div]:bg-primary" : ""}`} />
      </CardContent>
    </Card>
  );
}

function RunSummaryCard({ title, run }: { title: string; run: DeveloperOverviewMetricPoint | null }) {
  return (
    <Card className="border-border/70 bg-card/90">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <Badge variant="outline">{run ? run.modelVersion : "No run"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {run ? (
          <>
            <div>
              <p className="font-display text-lg font-bold">{run.modelVariant}</p>
              <p className="text-xs text-muted-foreground">{run.datasetName} ({run.datasetRecordCount} samples)</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              <div className="rounded-lg border border-border/50 bg-background/50 p-2">
                <span className="text-muted-foreground">Accuracy:</span>{" "}
                <span className="font-semibold">{formatPercent(run.accuracy)}</span>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/50 p-2">
                <span className="text-muted-foreground">Precision:</span>{" "}
                <span className="font-semibold">{formatPercent(run.precision)}</span>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/50 p-2">
                <span className="text-muted-foreground">Recall:</span>{" "}
                <span className="font-semibold">{formatPercent(run.recall)}</span>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/50 p-2">
                <span className="text-muted-foreground">F1 Score:</span>{" "}
                <span className="font-semibold">{formatPercent(run.f1Score)}</span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No imported run results available.</p>
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

  const inApp = overview?.inAppMetrics;
  const mobilenetv2 = overview?.highlightedFamilies.mobilenetv2 ?? null;
  const mobilenetv3 = overview?.highlightedFamilies.mobilenetv3 ?? null;

  // Chart 1: Model Identified vs Actual Ground Truth ("In-App Model Accuracy") per Class
  const identifiedVsActualData = (inApp?.classBreakdown ?? []).map((item) => ({
    name: item.class.charAt(0).toUpperCase() + item.class.slice(1),
    "Model Identified": item.modelIdentifiedCount,
    "Actual (Ground Truth)": item.actualCount,
    TP: item.tp,
  }));

  // Chart 2: Model Comparisons (Imported Models vs In-App Model Accuracy)
  const comparisonData = [
    ...(overview?.latestRuns ?? []).map((run) => ({
      name: `${run.modelFamily} (${run.modelVersion})`,
      Accuracy: Math.round(run.accuracy * 1000) / 10,
      Precision: Math.round(run.precision * 1000) / 10,
      Recall: Math.round(run.recall * 1000) / 10,
      F1: Math.round(run.f1Score * 1000) / 10,
      isLive: false,
    })),
    ...(inApp
      ? [
          {
            name: "In-App Model (Live Dataset)",
            Accuracy: Math.round(inApp.inAppAccuracy * 1000) / 10,
            Precision: Math.round(inApp.inAppPrecision * 1000) / 10,
            Recall: Math.round(inApp.inAppRecall * 1000) / 10,
            F1: Math.round(inApp.inAppF1Score * 1000) / 10,
            isLive: true,
          },
        ]
      : []),
  ];

  // Chart 3: Meat Type Accuracy Breakdown
  const meatTypeChartData = (inApp?.meatTypeBreakdown ?? []).map((item) => ({
    name: item.meatType.charAt(0).toUpperCase() + item.meatType.slice(1),
    Accuracy: Math.round(item.accuracy * 1000) / 10,
    Total: item.totalCount,
    Correct: item.correctCount,
  }));

  // Colors for charts
  const PRIMARY_COLOR = "hsl(var(--primary))";
  const SECONDARY_COLOR = "hsl(var(--secondary))";
  const FRESH_COLOR = "#22c55e";
  const WARNING_COLOR = "#eab308";
  const SPOILED_COLOR = "#ef4444";
  const ACCENT_COLOR = "#3b82f6";

  return (
    <section className="space-y-6">
      {/* Overview Header & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Developer Model Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Evaluation of model accuracy based on inspection datasets and comparisons across model architectures.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="gap-1.5 py-1 px-3" variant="secondary">
            <CheckCircle2 className="h-3.5 w-3.5 text-fresh" />
            {inApp?.correctlyIdentified ?? 0} / {inApp?.totalEvaluated ?? 0} Correct
          </Badge>
          <Badge className="gap-1.5 py-1 px-3" variant="outline">
            <Activity className="h-3.5 w-3.5 text-primary" />
            {overview?.latestRuns.length ?? 0} Imported Runs
          </Badge>
        </div>
      </div>

      {/* In-App Model Metrics Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> In-App Model Metrics
          </h3>
          <span className="text-xs text-muted-foreground">Computed live from Datasets subtab</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InAppMetricCard
            label="In-App Model Accuracy"
            value={inApp?.inAppAccuracy}
            subtext={`${inApp?.correctlyIdentified ?? 0} of ${inApp?.totalEvaluated ?? 0} records`}
            icon={Target}
            highlight={true}
          />
          <InAppMetricCard
            label="In-App Precision"
            value={inApp?.inAppPrecision}
            subtext="Positive predictive value"
            icon={Crosshair}
          />
          <InAppMetricCard
            label="In-App Recall"
            value={inApp?.inAppRecall}
            subtext="Sensitivity rate"
            icon={Scale}
          />
          <InAppMetricCard
            label="In-App F1-Score"
            value={inApp?.inAppF1Score}
            subtext="Harmonic mean"
            icon={Layers}
          />
        </div>
      </div>

      {/* Graph 1: Model Identified vs Actual Ground Truth */}
      <Card className="border-border/70 bg-card/90">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <BarChart3 className="h-4 w-4 text-primary" />
                Model Identified vs Actual Ground Truth ("In-App Model Accuracy")
              </CardTitle>
              <CardDescription className="text-xs">
                Comparing predictions generated by the model vs actual ground truth labels provided in the Datasets subtab per class.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {inApp?.totalEvaluated ?? 0} Evaluated Samples
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {identifiedVsActualData.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={identifiedVsActualData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.9)", borderRadius: "8px", color: "#fff", border: "none" }}
                  />
                  <Legend />
                  <Bar dataKey="Model Identified" fill={ACCENT_COLOR} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual (Ground Truth)" fill={FRESH_COLOR} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="TP" name="Correctly Identified (TP)" fill={WARNING_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">No inspection dataset records available.</p>
          )}
        </CardContent>
      </Card>

      {/* Graph 2: Models Comparison (Imported Runs vs Live In-App Dataset Metrics) */}
      <Card className="border-border/70 bg-card/90">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Scale className="h-4 w-4 text-primary" />
            Models Comparison (Imported Runs vs In-App Live Accuracy)
          </CardTitle>
          <CardDescription className="text-xs">
            Comparison of performance metrics across model families (MobileNetV2, MobileNetV3) and live in-app model accuracy.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {comparisonData.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.9)", borderRadius: "8px", color: "#fff", border: "none" }}
                    formatter={(value: number) => [`${value}%`]}
                  />
                  <Legend />
                  <Bar dataKey="Accuracy" fill={PRIMARY_COLOR} name="Accuracy %" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Precision" fill={FRESH_COLOR} name="Precision %" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Recall" fill={WARNING_COLOR} name="Recall %" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="F1" fill={SPOILED_COLOR} name="F1 Score %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">No model comparison metrics available.</p>
          )}
        </CardContent>
      </Card>

      {/* Graph 3 & 4: Meat Type Accuracy & Highlights */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/90">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Target className="h-4 w-4 text-primary" />
              In-App Accuracy by Meat Type
            </CardTitle>
            <CardDescription className="text-xs">Model accuracy percentages broken down by meat category.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {meatTypeChartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={meatTypeChartData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => [`${value}%`]} />
                    <Bar dataKey="Accuracy" fill={FRESH_COLOR} radius={[0, 4, 4, 0]}>
                      {meatTypeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.Accuracy >= 80 ? FRESH_COLOR : entry.Accuracy >= 60 ? WARNING_COLOR : SPOILED_COLOR} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">No meat type breakdown available.</p>
            )}
          </CardContent>
        </Card>

        {/* Model Run Highlights */}
        <div className="space-y-4">
          <RunSummaryCard title="MobileNetV2 Primary Run" run={mobilenetv2} />
          <RunSummaryCard title="MobileNetV3 Primary Run" run={mobilenetv3} />
        </div>
      </div>

      {/* In-App Confusion Matrix & Detailed Class Breakdown Table */}
      <Card className="border-border/70 bg-card/90">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            In-App Model Class Performance Breakdown
          </CardTitle>
          <CardDescription className="text-xs">
            Detailed precision, recall, F1 score, and TP/FP/FN/TN metrics for each freshness classification.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Freshness Class</TableHead>
                <TableHead>Model Identified</TableHead>
                <TableHead>Actual (Ground Truth)</TableHead>
                <TableHead>True Positives (TP)</TableHead>
                <TableHead>False Positives (FP)</TableHead>
                <TableHead>False Negatives (FN)</TableHead>
                <TableHead>Precision</TableHead>
                <TableHead>Recall</TableHead>
                <TableHead>F1 Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(inApp?.classBreakdown ?? []).map((row) => (
                <TableRow key={row.class}>
                  <TableCell className="font-semibold capitalize">{row.class}</TableCell>
                  <TableCell>{row.modelIdentifiedCount}</TableCell>
                  <TableCell>{row.actualCount}</TableCell>
                  <TableCell className="text-fresh font-medium">{row.tp}</TableCell>
                  <TableCell className={row.fp > 0 ? "text-warning font-medium" : "text-muted-foreground"}>{row.fp}</TableCell>
                  <TableCell className={row.fn > 0 ? "text-spoiled font-medium" : "text-muted-foreground"}>{row.fn}</TableCell>
                  <TableCell>{formatPercent(row.precision)}</TableCell>
                  <TableCell>{formatPercent(row.recall)}</TableCell>
                  <TableCell className="font-semibold">{formatPercent(row.f1Score)}</TableCell>
                </TableRow>
              ))}
              {(!inApp?.classBreakdown || inApp.classBreakdown.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">
                    No class breakdown available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
