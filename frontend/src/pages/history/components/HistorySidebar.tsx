import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import type { FreshnessClassification } from "@/types/inspection";
import type { HistoryMonthlyCount } from "../types";
import {
  getHistoryClassificationColorClass,
  HISTORY_CLASSIFICATIONS,
} from "../utils/historyPage";

type HistorySidebarProps = {
  classificationCounts: Record<FreshnessClassification, number>;
  monthlyCounts: HistoryMonthlyCount[];
  selectedDayAverageConfidence: number;
  selectedDayCount: number;
  totalInspections: number;
};

export function HistorySidebar({
  classificationCounts,
  monthlyCounts,
  selectedDayAverageConfidence,
  selectedDayCount,
  totalInspections,
}: HistorySidebarProps) {
  return (
    <section className="min-w-0 space-y-4">
      <Card className="rounded-3xl border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="text-sm font-display uppercase tracking-wider">
            Selected Day Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Day Inspections
            </p>
            <p className="mt-1 font-display text-2xl font-semibold">{selectedDayCount}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Day Avg Confidence
            </p>
            <p className="mt-1 font-display text-2xl font-semibold">
              {selectedDayAverageConfidence}%
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
            <BarChart3 className="h-4 w-4" />
            Classification Mix
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {HISTORY_CLASSIFICATIONS.map((classification) => {
            const count = classificationCounts[classification] || 0;
            const percentage = totalInspections > 0 ? (count / totalInspections) * 100 : 0;

            return (
              <div key={classification}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-display text-xs uppercase tracking-wider">
                    {classification}
                  </span>
                  <span className="font-display text-xs text-muted-foreground">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all ${getHistoryClassificationColorClass(classification)}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="text-sm font-display uppercase tracking-wider">
            Recent Activity by Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!monthlyCounts.length ? (
            <p className="py-4 text-sm text-muted-foreground">No activity yet</p>
          ) : (
            <div className="space-y-2">
              {monthlyCounts.map((month) => (
                <div
                  key={month.label}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-background/55 px-3 py-2.5"
                >
                  <span className="text-xs text-muted-foreground">{month.label}</span>
                  <span className="font-display text-sm font-semibold">{month.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
