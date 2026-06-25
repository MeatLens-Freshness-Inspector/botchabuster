import { ShieldAlert } from "lucide-react";
import { MockHotspot } from "@/components/tutorial/MockHotspot";
import type { TutorialStepDefinition } from "@/lib/tutorials/tutorialDefinitions";

interface SafetyMockSceneProps {
  step: TutorialStepDefinition;
  onAdvance: () => void;
}

export function SafetyMockScene({ step, onAdvance }: SafetyMockSceneProps) {
  const isAcknowledge = step.id === "safety-acknowledge";

  return (
    <div className="flex min-h-full flex-col bg-[hsl(var(--background))]">
      {/* Mock status bar */}
      <div className="flex items-center justify-between px-4 py-1 text-[9px] text-muted-foreground">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span>●●●</span>
          <span>WiFi</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Page header */}
      <div className="border-b border-border/60 bg-card/90 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-[hsl(var(--warning)/0.16)]">
            <ShieldAlert className="h-4 w-4 text-warning" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold">Safety Reminder</p>
            <p className="text-[9px] text-muted-foreground">Before you inspect</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Warning banner */}
        <div className="rounded-xl border border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.12)] p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-warning" />
            <p className="font-display text-[10px] font-semibold uppercase tracking-wider text-warning">
              Official protocol still applies
            </p>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Use MeatLens as decision support only. Final decisions must align
            with your LGU or institutional procedure.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Acknowledgement
          </span>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        {/* Acknowledge hotspot */}
        <MockHotspot
          active={isAcknowledge}
          onAdvance={onAdvance}
          label="Tap here"
        >
          <div className="rounded-xl border border-primary/50 bg-[hsl(var(--primary)/0.12)] p-3">
            <p className="font-display text-[10px] font-semibold uppercase tracking-wider text-primary">
              I understand the reminder
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Confirm the safety reminder to continue into the inspection.
            </p>
          </div>
        </MockHotspot>

        {/* Supporting text */}
        <p className="text-center text-[9px] leading-relaxed text-muted-foreground">
          This acknowledgement is logged with each inspection session for
          compliance tracking.
        </p>
      </div>
    </div>
  );
}
