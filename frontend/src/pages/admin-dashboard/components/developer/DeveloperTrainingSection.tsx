import React from "react";
import { UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TrainingRunRecord } from "@/integrations/api/DeveloperDashboardClient";

function formatPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function DeveloperTrainingSection({
  trainingRuns,
  onImport,
  isImporting,
  isLoading,
}: {
  trainingRuns: TrainingRunRecord[];
  onImport: (file: File) => Promise<void>;
  isImporting: boolean;
  isLoading: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Training</h2>
          <p className="text-sm text-muted-foreground">Imported results from local training runs.</p>
        </div>
        <Badge variant="outline">{trainingRuns.length} runs</Badge>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UploadCloud className="h-4 w-4" />
            Import Run Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <Input
            type="file"
            accept=".zip,application/zip"
            disabled={isImporting}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void onImport(file);
                event.target.value = "";
              }
            }}
          />
          <p className="text-sm text-muted-foreground">
            Training runs are executed locally. Upload the results ZIP after training completes.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {isLoading ? (
          <Card className="border-border/70 bg-card/90">
            <CardContent className="p-6 text-sm text-muted-foreground">Loading training runs...</CardContent>
          </Card>
        ) : null}

        {!isLoading && trainingRuns.length === 0 ? (
          <Card className="border-border/70 bg-card/90">
            <CardContent className="p-6 text-sm text-muted-foreground">No imported training runs yet.</CardContent>
          </Card>
        ) : null}

        {trainingRuns.map((run) => (
          <Card key={run.runId} className="border-border/70 bg-card/90">
            <CardHeader className="flex-row items-start justify-between gap-3 p-4 pb-2">
              <div>
                <CardTitle className="text-base">
                  {run.modelFamily} {run.modelVariant}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {run.datasetName} | {formatDate(run.createdAt)}
                </p>
              </div>
              <Badge variant="outline">{run.modelVersion}</Badge>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-2 xl:grid-cols-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Records</p>
                <p className="font-display text-xl font-semibold">{run.datasetRecordCount}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Accuracy</p>
                <p className="font-display text-xl font-semibold">{formatPercent(run.metrics.accuracy)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Precision</p>
                <p className="font-display text-xl font-semibold">{formatPercent(run.metrics.precision)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Recall</p>
                <p className="font-display text-xl font-semibold">{formatPercent(run.metrics.recall)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">F1 Score</p>
                <p className="font-display text-xl font-semibold">{formatPercent(run.metrics.f1Score)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
