import { AnalysisResultCard } from "@/components/AnalysisResultCard";
import { Camera } from "lucide-react";
import type { AnalysisResult, InspectionDecisionSource } from "@/types/inspection";

type InspectAnalysisSectionProps = {
  result: AnalysisResult | null;
  inspectionDecisionSource: InspectionDecisionSource | null;
  showDetailedResults: boolean;
};

export function InspectAnalysisSection({
  result,
  inspectionDecisionSource,
  showDetailedResults,
}: InspectAnalysisSectionProps) {
  const isProtocolResult = inspectionDecisionSource === "protocol_pre_scan" && result !== null;

  return (
    <section className="min-w-0 rounded-3xl border border-border/70 bg-card/92 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold">Analysis Output</h2>
        <span className="rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
          {result ? "Ready" : "Awaiting"}
        </span>
      </div>

      {result ? (
        <div className="space-y-4">
          {isProtocolResult && (
            <div className="rounded-2xl border border-warning/30 bg-[hsl(var(--warning)/0.08)] px-4 py-3 text-sm text-foreground">
              <p className="font-display text-xs uppercase tracking-widest text-warning">
                Protocol Result: Spoiled
              </p>
              <p className="mt-2 text-sm font-medium">
                Failed pre-scan safety protocol.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                AI analysis was skipped because one or more safety protocol answers were marked
                as No.
              </p>
            </div>
          )}
          <AnalysisResultCard
            result={result}
            showDetailedResults={showDetailedResults}
          />
        </div>
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
