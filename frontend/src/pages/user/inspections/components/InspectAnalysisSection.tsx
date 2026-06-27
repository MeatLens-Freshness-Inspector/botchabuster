import { AnalysisResultCard } from "@/components/AnalysisResultCard";
import { Camera } from "lucide-react";
import type { AnalysisResult } from "@/types/inspection";

type InspectAnalysisSectionProps = {
  result: AnalysisResult | null;
  showDetailedResults: boolean;
};

export function InspectAnalysisSection({
  result,
  showDetailedResults,
}: InspectAnalysisSectionProps) {
  return (
    <section className="min-w-0 rounded-3xl border border-border/70 bg-card/92 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold">Analysis Output</h2>
        <span className="rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
          {result ? "Ready" : "Awaiting"}
        </span>
      </div>

      {result ? (
        <AnalysisResultCard
          result={result}
          showDetailedResults={showDetailedResults}
        />
      ) : (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border/70 bg-background/50 text-center text-muted-foreground">
          <Camera className="mb-3 h-10 w-10" />
          <p className="font-display text-sm uppercase tracking-wider">No analysis yet</p>
          <p className="mt-1 max-w-xs text-xs">
            Capture a sample and run analysis to view freshness classification and metrics.
          </p>
        </div>
      )}
    </section>
  );
}
