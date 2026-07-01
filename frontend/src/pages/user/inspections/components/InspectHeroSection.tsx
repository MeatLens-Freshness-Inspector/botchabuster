import { Microscope } from "lucide-react";

type InspectHeroSectionProps = {
  locationDisplayLabel: string;
  coordinateStatusText: string | null;
  captureStatusText: string;
  analysisStatusText: string;
  confidenceText: string;
  confidenceSummaryClass: string;
};

export function InspectHeroSection({
  locationDisplayLabel,
  coordinateStatusText,
  captureStatusText,
  analysisStatusText,
  confidenceText,
  confidenceSummaryClass,
}: InspectHeroSectionProps) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-[0_24px_70px_-34px_rgba(0,0,0,0.65)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)]">
            <Microscope className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">Inspect</h1>
            <p className="text-xs text-muted-foreground">
              Capture, analyze, and classify meat freshness
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Market Location
          </p>
          <p className="mt-1 break-words font-display text-xl font-semibold leading-tight">
            {locationDisplayLabel || "--"}
          </p>
          {coordinateStatusText && (
            <p className="mt-1 text-[11px] text-muted-foreground">{coordinateStatusText}</p>
          )}
        </div>
        <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)] p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Capture Status
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">{captureStatusText}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Analysis Status
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">{analysisStatusText}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Confidence
          </p>
          <p className={`mt-1 font-display text-2xl font-semibold ${confidenceSummaryClass}`}>
            {confidenceText}
          </p>
        </div>
      </div>
    </section>
  );
}
