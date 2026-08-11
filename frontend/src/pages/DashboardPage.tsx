import { PageHeader } from "@/shared/ui/page-header";
import { MetricCard } from "@/shared/ui/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useInspectionStats } from "@/features/inspection-history";
import { Loader2 } from "lucide-react";
import type { FreshnessClassification } from "@/entities/inspection";

const classColors: Record<FreshnessClassification, string> = {
  fresh: "bg-fresh",
  "not fresh": "bg-warning",
  acceptable: "bg-acceptable",
  warning: "bg-warning",
  spoiled: "bg-spoiled",
};

const DashboardPage = () => {
  const { data: stats, isLoading } = useInspectionStats();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const classifications: FreshnessClassification[] = ["fresh", "not fresh", "acceptable", "warning", "spoiled"];
  const total = stats?.total || 0;

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Dashboard" subtitle="Inspection statistics overview" />

      <div className="px-4 space-y-4">
        <MetricCard label="Total Inspections" value={total} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-display uppercase tracking-widest text-muted-foreground">
              By Classification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {classifications.map((c) => {
              const count = stats?.byClassification[c] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={c}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display text-xs uppercase tracking-wider capitalize">
                      {c}
                    </span>
                    <span className="font-display text-xs text-muted-foreground">
                      {count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all ${classColors[c]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
