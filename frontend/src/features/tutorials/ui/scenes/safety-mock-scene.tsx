import React from "react";
import { ShieldAlert } from "lucide-react";
import { MockHotspot } from "../mock-hotspot";
import { TutorialAppShell } from "../tutorial-app-shell";
import type { TutorialStepDefinition } from "../../model/inspection-tutorial";

interface SafetyMockSceneProps {
  step: TutorialStepDefinition;
  onAdvance: () => void;
}

export function SafetyMockScene({ step, onAdvance }: SafetyMockSceneProps) {
  return (
    <TutorialAppShell activeTab="inspect" title="Safety Reminder" subtitle="Before you inspect">
      <div className="flex flex-col gap-3 p-4">
        <div className="rounded-xl border border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.12)] p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-warning" />
            <p className="font-display text-[10px] font-semibold uppercase tracking-wider text-warning">
              Official protocol still applies
            </p>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Use MeatLens as decision support only. Final decisions must align with your LGU or institutional procedure.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Acknowledgement</span>
          <div className="h-px flex-1 bg-border/60" />
        </div>
        <MockHotspot active={step.id === "safety-acknowledge"} onAdvance={onAdvance} label="Tap here" ariaLabel={step.hotspotLabel}>
          <div className="rounded-xl border border-primary/50 bg-[hsl(var(--primary)/0.12)] p-3">
            <p className="font-display text-[10px] font-semibold uppercase tracking-wider text-primary">I understand the reminder</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Confirm the safety reminder to continue into the inspection.</p>
          </div>
        </MockHotspot>
        <p className="text-center text-[9px] leading-relaxed text-muted-foreground">This acknowledgement is logged with each inspection session for compliance tracking.</p>
      </div>
    </TutorialAppShell>
  );
}
