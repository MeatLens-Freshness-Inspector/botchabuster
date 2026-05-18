import type { AnalysisResult } from "@/types/inspection";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConfidenceFillClass, getConfidenceTextClass } from "@/lib/confidenceLevel";
import { cn } from "@/lib/utils";

interface AnalysisResultCardProps {
  result: AnalysisResult;
  showDetailedResults?: boolean;
  className?: string;
}

export function AnalysisResultCard({ result, showDetailedResults = true, className }: AnalysisResultCardProps) {
  const sourceLabel =
    result.analysis_source === "backend"
      ? "Backend"
      : "MobileNetV3 ONNX";
  const confidenceFillClass = getConfidenceFillClass(result.confidence_score);
  const confidenceTextClass = getConfidenceTextClass(result.confidence_score);

  return (
    <div className={cn("space-y-3", className)}>
      <Card className="rounded-2xl border-border/70 bg-card/95">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-display uppercase tracking-wider">Classification</CardTitle>
            <FreshnessBadge classification={result.classification} size="lg" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Confidence</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("h-full rounded-full transition-all", confidenceFillClass)}
                style={{ width: `${result.confidence_score}%` }}
              />
            </div>
            <span className={cn("font-display text-sm font-bold", confidenceTextClass)}>{result.confidence_score}%</span>
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">Source: {sourceLabel}</p>
          {typeof result.freshness_score === "number" && (
            <p className="mt-1 text-[11px] text-muted-foreground">Freshness score: {Math.round(result.freshness_score)}/100</p>
          )}
          {result.recommendation && (
            <p className="mt-1 text-[11px] text-muted-foreground">Recommendation: {result.recommendation}</p>
          )}
          {result.model_confidence_score !== null && result.model_confidence_score !== undefined && (
            <p className="mt-1 text-[11px] text-muted-foreground">Model confidence: {result.model_confidence_score}%</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 bg-card/95">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display uppercase tracking-wider">Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-secondary-foreground">{result.explanation}</p>
          {showDetailedResults && result.flagged_deviations.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-[10px] font-display uppercase tracking-widest text-warning">Flagged Deviations</p>
              <ul className="space-y-1">
                {result.flagged_deviations.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-0.5 text-warning">*</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
