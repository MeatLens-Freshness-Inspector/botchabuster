import React from "react";
import type { DisputeAnalyticsSummary } from "../model/dispute-analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

const metricStyles = [
  "border-primary/30 bg-[hsl(var(--primary)/0.14)]",
  "border-warning/30 bg-[hsl(var(--warning)/0.12)]",
  "border-fresh/30 bg-[hsl(var(--fresh)/0.12)]",
  "border-destructive/30 bg-[hsl(var(--destructive)/0.10)]",
  "border-border/70 bg-background/60",
];

export type DisputeStatisticsProps = {
  summary: DisputeAnalyticsSummary;
  isLoading?: boolean;
  title?: string;
  description?: string;
};

export function DisputeStatistics({
  summary,
  isLoading = false,
  title = "Dispute statistics",
  description = "Current dispute volume and resolution status.",
}: DisputeStatisticsProps) {
  const metrics = [
    ["Total disputes", summary.total, ""],
    ["Pending", summary.pending, ""],
    ["Approved", summary.approved, ""],
    ["Rejected", summary.rejected, ""],
    ["Dispute rate", summary.disputeRate, "%"],
  ] as const;

  return (
    <Card className="min-w-0 rounded-[32px] border-border/70 bg-card/95 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.45)]" aria-busy={isLoading}>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-4 text-sm text-muted-foreground">Loading dispute statistics…</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {metrics.map(([label, value, suffix], index) => (
                <div key={label} className={`rounded-2xl border p-4 ${metricStyles[index]}`}>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
                  <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                    {value}{suffix}
                  </p>
                </div>
              ))}
            </div>
            {summary.total === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No dispute records have been submitted.</p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
