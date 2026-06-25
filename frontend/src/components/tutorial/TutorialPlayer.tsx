import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TutorialStepDefinition } from "@/lib/tutorials/tutorialDefinitions";
import { MockPhoneFrame } from "@/components/tutorial/MockPhoneFrame";
import { TutorialScene } from "@/components/tutorial/TutorialScene";

interface TutorialPlayerProps {
  steps: TutorialStepDefinition[];
  finishLabel: string;
  completionTitle: string;
  completionBody: string;
  onFinish: () => void;
  onSkip?: () => void;
  isBusy?: boolean;
  errorMessage?: string | null;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function TutorialPlayer({
  steps,
  finishLabel,
  completionTitle,
  completionBody,
  onFinish,
  onSkip,
  isBusy = false,
  errorMessage = null,
  secondaryAction,
}: TutorialPlayerProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setStepIndex(0);
  }, [steps]);

  const activeStep = steps[stepIndex];

  const handleAdvance = () => {
    setStepIndex((current) => current + 1);
  };

  /* ── Completion screen ─────────────────────────────────────── */
  if (!activeStep) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_36%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center justify-center">
          <Card className="w-full max-w-xl rounded-[32px] border border-border/70 bg-card/95 shadow-[0_32px_100px_-48px_rgba(0,0,0,0.72)]">
            <CardHeader className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)]">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="font-display text-2xl uppercase tracking-[0.14em] sm:text-3xl">
                  {completionTitle}
                </CardTitle>
                <CardDescription className="mx-auto max-w-md text-sm sm:text-base">
                  {completionBody}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMessage ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {errorMessage}
                </p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  onClick={onFinish}
                  disabled={isBusy}
                  className="h-11 rounded-xl px-5"
                >
                  {finishLabel}
                </Button>
                {secondaryAction ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={secondaryAction.onClick}
                    disabled={isBusy}
                    className="h-11 rounded-xl px-5"
                  >
                    {secondaryAction.label}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* ── Step progress dots ────────────────────────────────────── */
  const stepDots = steps.map((s, i) => {
    const isPast = i < stepIndex;
    const isActive = i === stepIndex;
    return (
      <div
        key={s.id}
        className={`h-1.5 rounded-full transition-all duration-300 ${
          isActive
            ? "w-6 bg-primary"
            : isPast
              ? "w-1.5 bg-primary/50"
              : "w-1.5 bg-border"
        }`}
      />
    );
  });

  /* ── Main step layout ──────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_36%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] px-4 py-6">
      <div className="mx-auto max-w-6xl">
        {/* Top bar: section label + skip */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {activeStep.sectionTitle} · Step {stepIndex + 1} of {steps.length}
          </span>
          {onSkip ? (
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-[11px] uppercase tracking-[0.16em]"
              onClick={onSkip}
            >
              Skip for now
            </Button>
          ) : null}
        </div>

        {/* Two-column layout: phone frame | instruction card */}
        <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
          {/* Phone frame with real mock UI */}
          <div className="flex-shrink-0">
            <MockPhoneFrame>
              <TutorialScene step={activeStep} onAdvance={handleAdvance} />
            </MockPhoneFrame>
          </div>

          {/* Instruction card */}
          <div className="w-full max-w-sm lg:max-w-md">
            <Card className="rounded-[28px] border border-border/70 bg-card/95 shadow-[0_32px_100px_-48px_rgba(0,0,0,0.72)]">
              <CardHeader className="space-y-4">
                {/* Step progress dots */}
                <div className="flex items-center gap-1">{stepDots}</div>

                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {activeStep.sectionTitle}
                  </p>
                  <CardTitle className="font-display text-xl uppercase tracking-[0.12em] sm:text-2xl">
                    {activeStep.stepTitle}
                  </CardTitle>
                </div>

                <CardDescription className="text-sm leading-relaxed sm:text-base">
                  {activeStep.instruction}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Hotspot hint */}
                <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/55 p-4">
                  {/* Pulsing dot indicator */}
                  <div className="mt-0.5 flex-shrink-0">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tap the highlighted{" "}
                    <span className="font-semibold text-foreground">
                      {activeStep.hotspotLabel}
                    </span>{" "}
                    in the phone screen to continue.
                  </p>
                </div>

                {errorMessage ? (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {errorMessage}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
