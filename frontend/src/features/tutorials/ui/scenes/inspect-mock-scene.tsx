import React from "react";
import { Camera, CheckCircle2, ChevronDown, MapPin, ScanLine, Save, ShieldAlert, TestTube2 } from "lucide-react";
import { tutorialFixtures } from "../../model/tutorial-fixtures";
import type { TutorialStepDefinition } from "../../model/inspection-tutorial";
import { MockHotspot } from "../mock-hotspot";
import { TutorialAppShell } from "../tutorial-app-shell";

interface InspectMockSceneProps {
  step: TutorialStepDefinition;
  onAdvance: () => void;
}

export function InspectMockScene({ step, onAdvance }: InspectMockSceneProps) {
  const fixture = tutorialFixtures.inspect;
  const isScope = step.id === "inspect-scope";
  const isMarket = step.id === "inspect-market";
  const isPreScan = step.id === "inspect-prescan";
  const isCapture = step.id === "inspect-capture";
  const isAnalysis = step.id === "inspect-analysis";
  const isSave = step.id === "inspect-save";
  const hasCapture = isAnalysis || isSave;
  const hasAnalysis = isSave;

  return (
    <TutorialAppShell activeTab="inspect" title="Inspect" subtitle="Capture, analyze, and classify meat freshness">
      <div className="flex flex-col gap-3 p-3">
        <section className="rounded-2xl border border-border/70 bg-card/90 p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-[hsl(var(--primary)/0.16)]"><TestTube2 className="h-4 w-4 text-primary" /></div>
            <div><p className="font-display text-sm font-semibold">Inspect</p><p className="text-[9px] text-muted-foreground">Field capture workflow</p></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <div className="rounded-xl border border-border/70 bg-[hsl(var(--warning)/0.16)] px-2 py-2"><p className="text-[8px] uppercase tracking-widest text-muted-foreground">Market Location</p><p className="mt-1 truncate font-display text-[10px] font-semibold">{fixture.locationLabel}</p><p className="mt-1 text-[8px] text-muted-foreground">{fixture.gpsStatus}</p></div>
            <div className="rounded-xl border border-border/70 bg-[hsl(var(--primary)/0.16)] px-2 py-2"><p className="text-[8px] uppercase tracking-widest text-muted-foreground">Capture Status</p><p className="mt-1 font-display text-sm font-semibold">{hasCapture ? "Captured" : fixture.captureStatus}</p></div>
            <div className="rounded-xl border border-border/70 bg-background/65 px-2 py-2"><p className="text-[8px] uppercase tracking-widest text-muted-foreground">Analysis Status</p><p className="mt-1 font-display text-sm font-semibold">{hasAnalysis ? "Ready" : fixture.analysisStatus}</p></div>
            <div className="rounded-xl border border-border/70 bg-background/65 px-2 py-2"><p className="text-[8px] uppercase tracking-widest text-muted-foreground">Confidence</p><p className="mt-1 font-display text-sm font-semibold text-fresh">{hasAnalysis ? "94%" : fixture.confidenceLabel}</p></div>
          </div>
        </section>

        <MockHotspot active={isScope} onAdvance={onAdvance} label="Tap here" ariaLabel={step.hotspotLabel}>
          <section className="rounded-2xl border border-border/70 bg-card/90 p-3">
            <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-warning" /><p className="font-display text-[10px] font-semibold uppercase tracking-wider">{fixture.scopeTitle}</p></div>
            <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">Use the result as decision support only. Official inspection protocol still applies.</p>
            <p className="mt-2 text-[9px] font-medium text-primary">{fixture.scopeCtaLabel} →</p>
          </section>
        </MockHotspot>

        <MockHotspot active={isPreScan} onAdvance={onAdvance} label="Tap here" ariaLabel={step.hotspotLabel}>
          <section className="rounded-2xl border border-border/70 bg-card/90 p-3">
            <div className="flex items-start justify-between gap-2"><div><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-warning" /><p className="font-display text-[10px] font-semibold uppercase tracking-wider">Pre-Scan Safety Protocol</p></div><p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">Complete this checklist before opening the camera.</p></div><span className="rounded-full border border-border/70 bg-background/55 px-2 py-1 text-[8px] uppercase tracking-widest text-muted-foreground">{fixture.preScanStatus}</span></div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 text-[8px]"><div className="rounded-lg border border-input bg-background px-2 py-2">Stall Number<br /><span className="text-muted-foreground">e.g. 12-A</span></div><div className="rounded-lg border border-input bg-background px-2 py-2">Certificate Proof<br /><span className="text-muted-foreground">Required reference</span></div><div className="rounded-lg border border-input bg-background px-2 py-2">Meat Expiry Date<br /><span className="text-muted-foreground">Select date</span></div><div className="rounded-lg border border-input bg-background px-2 py-2">Storage Correct<br /><span className="text-muted-foreground">Select answer</span></div></div>
          </section>
        </MockHotspot>

        <section className="rounded-2xl border border-border/70 bg-card/90 p-3">
          <div className="mb-2 flex items-center gap-2"><TestTube2 className="h-4 w-4 text-muted-foreground" /><p className="font-display text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Capture Station</p></div>
          <MockHotspot active={isMarket} onAdvance={onAdvance} label="Tap here" ariaLabel={step.hotspotLabel}>
            <div className="rounded-xl border border-input bg-background/60 p-2"><p className="text-[8px] uppercase tracking-widest text-muted-foreground">Location Selection</p><div className="mt-1 flex h-8 items-center justify-between rounded-lg border border-input px-2 text-[9px]"><span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{fixture.locationLabel}</span><ChevronDown className="h-3 w-3 text-muted-foreground" /></div><p className="mt-1 text-[8px] text-muted-foreground">{fixture.gpsStatus}</p></div>
          </MockHotspot>
          {!isPreScan && !isScope && <MockHotspot active={isCapture} onAdvance={onAdvance} label="Tap here" ariaLabel={step.hotspotLabel}><div className="mt-2 flex aspect-[4/3] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/50">{hasCapture ? <div className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-gradient-to-br from-rose-900/30 via-amber-900/20 to-rose-800/30"><CheckCircle2 className="h-7 w-7 text-fresh" /><span className="mt-1 text-[8px] text-white/60">Tutorial sample captured</span></div> : <><Camera className="h-6 w-6 text-muted-foreground/40" /><p className="mt-1 text-[9px] text-muted-foreground/40">Open camera</p></>}</div></MockHotspot>}
          {isCapture && <p className="mt-2 text-[8px] text-muted-foreground">Model status: {fixture.modelStatus}</p>}
        </section>

        {isAnalysis && <MockHotspot active onAdvance={onAdvance} label="Tap here" ariaLabel={step.hotspotLabel}><div className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary font-display text-[10px] font-semibold uppercase tracking-wider text-primary-foreground"><ScanLine className="h-3.5 w-3.5" />Analyze Sample</div></MockHotspot>}
        {hasAnalysis && <section className="rounded-2xl border border-border/70 bg-card/90 p-3"><div className="flex items-center justify-between"><p className="font-display text-[9px] uppercase tracking-wider text-muted-foreground">Analysis Output</p><span className="rounded-md border border-fresh/40 bg-fresh/20 px-1.5 py-0.5 font-display text-[9px] font-semibold text-fresh">Fresh</span></div><div className="mt-2 flex items-center gap-1.5"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full w-[94%] rounded-full bg-fresh" /></div><span className="font-display text-[10px] font-bold text-fresh">94%</span></div><p className="mt-1.5 text-[9px] leading-relaxed text-muted-foreground">Sample exhibits consistent coloration and firm texture indicative of fresh pork.</p></section>}
        {isSave && <MockHotspot active onAdvance={onAdvance} label="Tap here" ariaLabel={step.hotspotLabel}><div className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary font-display text-[10px] font-semibold uppercase tracking-wider text-primary-foreground"><Save className="h-3.5 w-3.5" />Save Record</div></MockHotspot>}
      </div>
    </TutorialAppShell>
  );
}
