import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { AdminDashboardPageViewModel } from "../../model/use-admin-dashboard";
import type { CalibrationReliabilityBin, FieldConfidenceBucket } from "@/entities/model-accuracy";

const chartConfig = {
  confidence: { label: "Predicted confidence", color: "hsl(var(--primary))" },
  accuracy: { label: "Observed accuracy", color: "hsl(var(--chart-2))" },
  sampleCount: { label: "Samples", color: "hsl(var(--chart-3))" },
  approved: { label: "Approved disputes", color: "hsl(var(--chart-2))" },
  rejected: { label: "Rejected disputes", color: "hsl(var(--chart-4))" },
  pending: { label: "Pending disputes", color: "hsl(var(--chart-5))" },
};

function percent(value: number | null): string {
  return value === null ? "Unavailable" : `${(value * 100).toFixed(1)}%`;
}

function binLabel(bin: { lowerBound: number; upperBound: number }): string {
  return `${Math.round(bin.lowerBound * 100)}–${Math.round(bin.upperBound * 100)}%`;
}

function reliabilityData(bins: CalibrationReliabilityBin[]) {
  return bins.map((bin) => ({
    label: binLabel(bin),
    confidence: bin.meanConfidence,
    accuracy: bin.observedAccuracy,
    sampleCount: bin.sampleCount,
  }));
}

function fieldChartData(buckets: FieldConfidenceBucket[]) {
  return buckets.map((bucket) => ({
    label: binLabel(bucket),
    approved: bucket.approvedCount,
    rejected: bucket.rejectedCount,
    pending: bucket.pendingCount,
    sampleCount: bucket.sampleCount,
  }));
}

function EmptyAnalytics({ children }: { children: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="rounded-[24px] border-border/70 bg-card/95 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.42)]">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tracking-tight tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{detail}</CardContent>
    </Card>
  );
}

export function ModelCalibration({ dashboard }: { dashboard: AdminDashboardPageViewModel }) {
  const navigate = useNavigate();
  const {
    calibrationAnalytics: query,
    calibrationClassName,
    calibrationModelVersionKey,
    setCalibrationClassName,
    setCalibrationModelVersionKey,
  } = dashboard;
  const analytics = query.data;
  const controlled = analytics?.controlled;
  const fieldMonitoring = analytics?.fieldMonitoring;
  const reliability = controlled ? reliabilityData(controlled.reliabilityBins) : [];
  const fieldData = fieldMonitoring ? fieldChartData(fieldMonitoring.buckets) : [];

  return (
    <section aria-labelledby="model-calibration-heading" className="space-y-4">
      <div className="rounded-[32px] border border-border/70 bg-card/95 p-5 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.45)]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Model calibration</p>
        <h2 id="model-calibration-heading" className="mt-2 font-display text-2xl font-semibold tracking-tight">
          How trustworthy is reported confidence?
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Controlled labeled validation results measure calibration. Production disputes are shown separately as field signals and are not treated as model accuracy.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="calibration-model-filter" className="mb-1.5 block text-xs font-medium text-muted-foreground">Model version</label>
          <Select value={calibrationModelVersionKey ?? "all"} onValueChange={(value) => setCalibrationModelVersionKey(value === "all" ? null : value)}>
            <SelectTrigger id="calibration-model-filter" className="rounded-xl bg-background/65"><SelectValue placeholder="All model versions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All model versions</SelectItem>
              {analytics?.availableModelVersions.map((model) => (
                <SelectItem key={model.versionKey} value={model.versionKey}>{model.displayName ?? model.versionKey}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="calibration-class-filter" className="mb-1.5 block text-xs font-medium text-muted-foreground">Freshness class</label>
          <Select value={calibrationClassName ?? "all"} onValueChange={(value) => setCalibrationClassName(value === "all" ? null : value)}>
            <SelectTrigger id="calibration-class-filter" className="rounded-xl bg-background/65"><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {analytics?.availableClasses.map((className) => <SelectItem key={className} value={className}>{className}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isLoading ? (
        <Card className="rounded-[28px] border-border/70 bg-card/95"><CardContent className="py-12 text-center text-sm text-muted-foreground" role="status">Loading calibration analytics…</CardContent></Card>
      ) : query.isError ? (
        <Card className="rounded-[28px] border-destructive/40 bg-card/95"><CardContent className="py-12 text-center text-sm text-destructive" role="alert">Unable to load calibration analytics. Try refreshing the Overview.</CardContent></Card>
      ) : !analytics || !controlled ? (
        <Card className="rounded-[28px] border-border/70 bg-card/95"><CardContent><EmptyAnalytics>No calibration results are available for these filters.</EmptyAnalytics></CardContent></Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Expected Calibration Error" value={percent(controlled.ece)} detail="Weighted gap between confidence and observed accuracy across 10 bins." />
            <MetricCard label="Brier Score" value={controlled.brierScore === null ? "Unavailable" : controlled.brierScore.toFixed(4)} detail="Lower is better; calculated from labeled probability predictions." />
            <MetricCard label="Labeled samples" value={controlled.sampleCount.toLocaleString()} detail="Samples used by the selected controlled calibration calculation." />
          </div>

          <Card className="min-w-0 rounded-[32px] border-border/70 bg-card/95">
            <CardHeader className="space-y-2"><CardTitle className="text-base font-semibold tracking-tight">Reliability diagram</CardTitle><CardDescription>Predicted confidence compared with observed accuracy. Points above the diagonal are underconfident; points below it are overconfident.</CardDescription></CardHeader>
            <CardContent>
              {controlled.sampleCount === 0 ? <EmptyAnalytics>No labeled validation samples are available for the selected filters.</EmptyAnalytics> : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full min-w-0">
                  <ComposedChart data={reliability} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis domain={[0, 1]} tickFormatter={(value) => `${Math.round(value * 100)}%`} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ReferenceLine segment={[{ x: "0–10%", y: 0 }, { x: "90–100%", y: 1 }]} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="accuracy" name="Observed accuracy" stroke="hsl(var(--chart-2))" strokeWidth={3} connectNulls={false} dot={{ r: 4 }} />
                  </ComposedChart>
                </ChartContainer>
              )}
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Reliability diagram legend">
                <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[hsl(var(--chart-2))]" />MeatLens calibration curve</span>
                <span><span className="mr-1.5 inline-block h-px w-3 align-middle bg-muted-foreground" />Ideal calibration</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <Card className="min-w-0 rounded-[32px] border-border/70 bg-card/95">
              <CardHeader className="space-y-2"><CardTitle className="text-base font-semibold tracking-tight">Confidence distribution</CardTitle><CardDescription>Count of controlled labeled predictions in each confidence range.</CardDescription></CardHeader>
              <CardContent>{controlled.sampleCount === 0 ? <EmptyAnalytics>No confidence distribution is available.</EmptyAnalytics> : <ChartContainer config={chartConfig} className="h-[260px] w-full min-w-0"><BarChart data={controlled.confidenceDistribution.map((bin) => ({ label: binLabel(bin), sampleCount: bin.sampleCount }))} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" className="stroke-border/50" /><XAxis dataKey="label" angle={-35} textAnchor="end" height={55} tick={{ fontSize: 9 }} className="fill-muted-foreground" /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="sampleCount" name="Labeled samples" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} /></BarChart></ChartContainer>}</CardContent>
            </Card>
            <Card className="min-w-0 rounded-[32px] border-border/70 bg-card/95">
              <CardHeader className="space-y-2"><CardTitle className="text-base font-semibold tracking-tight">Per-class calibration</CardTitle><CardDescription>One-vs-rest calibration for the freshness classes present in the imported labeled results.</CardDescription></CardHeader>
              <CardContent>{controlled.perClass.length === 0 ? <EmptyAnalytics>No class breakdown is available.</EmptyAnalytics> : <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="pb-3 font-medium">Class</th><th className="pb-3 font-medium">Samples</th><th className="pb-3 font-medium">ECE</th><th className="pb-3 font-medium">Brier</th></tr></thead><tbody>{controlled.perClass.map((entry) => <tr key={entry.className} className="border-b last:border-0"><td className="py-3 font-medium">{entry.className}</td><td className="py-3 tabular-nums">{entry.sampleCount.toLocaleString()}</td><td className="py-3 tabular-nums">{percent(entry.ece)}</td><td className="py-3 tabular-nums">{entry.brierScore === null ? "Unavailable" : entry.brierScore.toFixed(4)}</td></tr>)}</tbody></table></div>}</CardContent>
            </Card>
          </div>

          {fieldMonitoring && <FieldConfidenceSection monitoring={fieldMonitoring} onOpenInspection={(inspectionId) => navigate("/history", { state: { inspectionId } })} />}
        </>
      )}
    </section>
  );
}

function FieldConfidenceSection({ monitoring, onOpenInspection }: { monitoring: NonNullable<AdminDashboardPageViewModel["calibrationAnalytics"]["data"]>["fieldMonitoring"]; onOpenInspection: (inspectionId: string) => void }) {
  return (
    <section aria-labelledby="field-confidence-heading" className="space-y-4 border-t border-border/70 pt-8">
      <div><p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Field confidence monitoring</p><h2 id="field-confidence-heading" className="mt-2 font-display text-2xl font-semibold tracking-tight">Production dispute signals by AI confidence</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">These are observed dispute outcomes from production inspections. They do not establish model accuracy because undisputed predictions are not verified ground truth.</p></div>
      <Card className="min-w-0 rounded-[32px] border-border/70 bg-card/95"><CardHeader className="space-y-2"><CardTitle className="text-base font-semibold tracking-tight">Disputes by confidence range</CardTitle><CardDescription>Approved, rejected, and pending disputes grouped by the original AI confidence.</CardDescription></CardHeader><CardContent>{monitoring.buckets.every((bucket) => bucket.disputeCount === 0) ? <EmptyAnalytics>No production disputes are available for confidence monitoring.</EmptyAnalytics> : <ChartContainer config={chartConfig} className="h-[280px] w-full min-w-0"><BarChart data={fieldChartData(monitoring.buckets)} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" className="stroke-border/50" /><XAxis dataKey="label" angle={-35} textAnchor="end" height={55} tick={{ fontSize: 9 }} className="fill-muted-foreground" /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="approved" stackId="disputes" fill="hsl(var(--chart-2))" /><Bar dataKey="rejected" stackId="disputes" fill="hsl(var(--chart-4))" /><Bar dataKey="pending" stackId="disputes" fill="hsl(var(--chart-5))" radius={[6, 6, 0, 0]} /></BarChart></ChartContainer>}</CardContent></Card>
      <Card className="min-w-0 rounded-[32px] border-border/70 bg-card/95"><CardHeader className="space-y-2"><CardTitle className="text-base font-semibold tracking-tight">Confidence monitoring detail</CardTitle><CardDescription>Dispute rate uses only rows whose denominator is available; it is a field observation, not accuracy.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="pb-3 font-medium">Confidence</th><th className="pb-3 font-medium">Inspections</th><th className="pb-3 font-medium">Disputes</th><th className="pb-3 font-medium">Approved</th><th className="pb-3 font-medium">Rejected</th><th className="pb-3 font-medium">Pending</th><th className="pb-3 font-medium">Dispute rate</th></tr></thead><tbody>{monitoring.buckets.map((bucket) => <tr key={bucket.binIndex} className="border-b last:border-0"><td className="py-3 font-medium">{binLabel(bucket)}</td><td className="py-3 tabular-nums">{bucket.sampleCount}</td><td className="py-3 tabular-nums">{bucket.disputeCount}</td><td className="py-3 tabular-nums">{bucket.approvedCount}</td><td className="py-3 tabular-nums">{bucket.rejectedCount}</td><td className="py-3 tabular-nums">{bucket.pendingCount}</td><td className="py-3 tabular-nums">{percent(bucket.disputeRate)}</td></tr>)}</tbody></table></div></CardContent></Card>
      <Card className="min-w-0 rounded-[32px] border-border/70 bg-card/95"><CardHeader className="space-y-2"><CardTitle className="text-base font-semibold tracking-tight">High-confidence approved disputes</CardTitle><CardDescription>Approved disputes at or above the configured 80% investigation threshold. Open an inspection to review the original result and dispute history.</CardDescription></CardHeader><CardContent>{monitoring.highConfidenceApprovedDisputes.length === 0 ? <EmptyAnalytics>No high-confidence approved disputes are available.</EmptyAnalytics> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="pb-3 font-medium">Inspection</th><th className="pb-3 font-medium">Original prediction</th><th className="pb-3 font-medium">Confidence</th><th className="pb-3 font-medium">Reviewed result</th><th className="pb-3 font-medium">Resolution date</th><th className="pb-3 font-medium"><span className="sr-only">Action</span></th></tr></thead><tbody>{monitoring.highConfidenceApprovedDisputes.map((entry) => <tr key={entry.inspectionId} className="border-b last:border-0"><td className="py-3 font-mono text-xs">{entry.inspectionId}</td><td className="py-3">{entry.originalPrediction}</td><td className="py-3 tabular-nums">{percent(entry.originalConfidence)}</td><td className="py-3">{entry.disputeResult ?? "Approved"}</td><td className="py-3">{entry.resolutionDate ? new Date(entry.resolutionDate).toLocaleDateString() : "Unavailable"}</td><td className="py-3 text-right"><button type="button" className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => onOpenInspection(entry.inspectionId)}>Open inspection</button></td></tr>)}</tbody></table></div>}</CardContent></Card>
    </section>
  );
}
