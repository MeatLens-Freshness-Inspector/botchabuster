import { Microscope, Camera, ScanLine, Save, MapPin, ChevronDown } from "lucide-react";
import { MockHotspot } from "@/components/tutorial/MockHotspot";
import type { TutorialStepDefinition } from "@/lib/tutorials/tutorialDefinitions";

interface InspectMockSceneProps {
  step: TutorialStepDefinition;
  onAdvance: () => void;
}

function MockFreshnessBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-fresh/40 bg-fresh/20 px-1.5 py-0.5 font-display text-[9px] font-semibold uppercase tracking-wider text-fresh">
      <span>OK</span> Fresh
    </span>
  );
}

export function InspectMockScene({ step, onAdvance }: InspectMockSceneProps) {
  const isMarket = step.id === "inspect-market";
  const isCapture = step.id === "inspect-capture";
  const isAnalysis = step.id === "inspect-analysis";
  const isSave = step.id === "inspect-save";

  const showResult = isAnalysis || isSave;

  return (
    <div className="flex min-h-full flex-col bg-[hsl(var(--background))]">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 text-[9px] text-muted-foreground">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span>●●●</span>
          <span>WiFi</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Page header */}
      <div className="border-b border-border/60 bg-card/90 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-[hsl(var(--primary)/0.16)]">
            <Microscope className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="font-display text-xs font-semibold">Inspect</p>
            <p className="text-[9px] text-muted-foreground">Capture, analyze, and classify</p>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border border-border/60 bg-[hsl(var(--warning)/0.14)] px-2 py-1.5">
            <p className="text-[8px] uppercase tracking-widest text-muted-foreground">Location</p>
            <p className="mt-0.5 truncate font-display text-[10px] font-semibold">Dagupan City</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-[hsl(var(--primary)/0.14)] px-2 py-1.5">
            <p className="text-[8px] uppercase tracking-widest text-muted-foreground">Status</p>
            <p className="mt-0.5 font-display text-[10px] font-semibold">
              {isMarket || isCapture ? "Waiting" : "Ready"}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/65 px-2 py-1.5">
            <p className="text-[8px] uppercase tracking-widest text-muted-foreground">Analysis</p>
            <p className="mt-0.5 font-display text-[10px] font-semibold">
              {showResult ? "Fresh" : "Pending"}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/65 px-2 py-1.5">
            <p className="text-[8px] uppercase tracking-widest text-muted-foreground">Confidence</p>
            <p className="mt-0.5 font-display text-[10px] font-semibold text-fresh">
              {showResult ? "94%" : "--"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {/* Location selector hotspot */}
        <MockHotspot active={isMarket} onAdvance={onAdvance} label="Tap here">
          <div className="rounded-xl border border-border/60 bg-card/90 p-2.5">
            <p className="mb-1 text-[8px] uppercase tracking-widest text-muted-foreground">
              Location Selection
            </p>
            <div className="flex h-8 items-center justify-between rounded-lg border border-border/60 bg-background/60 px-2.5">
              <div className="flex items-center gap-1.5 text-[10px]">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span>Dagupan City Slaughterhouse</span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        </MockHotspot>

        {/* Camera capture area */}
        <MockHotspot active={isCapture} onAdvance={onAdvance} label="Tap here">
          <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/50">
            {isCapture ? (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/50 bg-[hsl(var(--primary)/0.16)]">
                  <Camera className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 font-display text-[9px] uppercase tracking-wider text-muted-foreground">
                  Open Camera
                </p>
              </>
            ) : isAnalysis || isSave ? (
              /* Mock captured image placeholder */
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-rose-900/30 via-amber-900/20 to-rose-800/30">
                <div className="text-center">
                  <div className="mx-auto mb-1 h-8 w-8 rounded-lg bg-white/10" />
                  <p className="text-[8px] text-white/60">Sample captured</p>
                </div>
              </div>
            ) : (
              <>
                <Camera className="h-6 w-6 text-muted-foreground/40" />
                <p className="mt-1 text-[9px] text-muted-foreground/40">No capture yet</p>
              </>
            )}
          </div>
        </MockHotspot>

        {/* Analyze button hotspot */}
        {isAnalysis && (
          <MockHotspot active={isAnalysis} onAdvance={onAdvance} label="Tap here">
            <div className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-primary font-display text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
              <ScanLine className="h-3.5 w-3.5" />
              Analyze Sample
            </div>
          </MockHotspot>
        )}

        {/* Analysis result card */}
        {showResult && (
          <div className="rounded-xl border border-border/60 bg-card/90 p-2.5">
            <div className="flex items-center justify-between">
              <p className="font-display text-[9px] uppercase tracking-wider text-muted-foreground">
                Classification
              </p>
              <MockFreshnessBadge />
            </div>
            <div className="mt-2">
              <p className="text-[8px] uppercase tracking-widest text-muted-foreground">Confidence</p>
              <div className="mt-1 flex items-center gap-1.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-[94%] rounded-full bg-fresh" />
                </div>
                <span className="font-display text-[10px] font-bold text-fresh">94%</span>
              </div>
            </div>
            <p className="mt-1.5 text-[9px] leading-relaxed text-muted-foreground">
              Sample exhibits consistent coloration and firm texture indicative of fresh pork.
            </p>
          </div>
        )}

        {/* Save button hotspot */}
        {isSave && (
          <MockHotspot active={isSave} onAdvance={onAdvance} label="Tap here">
            <div className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-primary font-display text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
              <Save className="h-3.5 w-3.5" />
              Save Record
            </div>
          </MockHotspot>
        )}
      </div>
    </div>
  );
}
