import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TutorialStepDefinition } from "@/lib/tutorials/tutorialDefinitions";

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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_36%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>
            {activeStep.sectionTitle} {stepIndex + 1} of {steps.length}
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

        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative rounded-[36px] border border-border/70 bg-card/88 p-3 shadow-[0_36px_120px_-56px_rgba(0,0,0,0.78)]">
            <div className="pointer-events-none absolute inset-3 rounded-[32px] bg-black/18" />
            <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-background">
              <div className="border-b border-border/70 bg-card/90 px-4 py-4">
                <p className="font-display text-lg font-semibold tracking-tight">
                  {activeStep.sceneTitle}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activeStep.sceneSubtitle}
                </p>
              </div>
              <div className="space-y-3 p-4">
                {activeStep.blocks.map((block) => {
                  const isHotspot = block.hotspotLabel === activeStep.hotspotLabel;
                  const toneClass =
                    block.tone === "warning"
                      ? "border-[hsl(var(--warning)/0.45)] bg-[hsl(var(--warning)/0.16)]"
                      : block.tone === "accent"
                        ? "border-primary/45 bg-[hsl(var(--primary)/0.12)]"
                        : "border-border/70 bg-card/70";

                  if (isHotspot) {
                    return (
                      <button
                        key={block.id}
                        type="button"
                        aria-label={block.hotspotLabel}
                        onClick={() => setStepIndex((current) => current + 1)}
                        className={`group flex w-full items-start justify-between rounded-2xl border px-4 py-4 text-left shadow-[0_0_0_1px_hsl(var(--primary)/0.16),0_0_0_10px_hsl(var(--primary)/0.08)] transition-transform hover:-translate-y-0.5 ${toneClass}`}
                      >
                        <div>
                          <p className="font-display text-sm uppercase tracking-[0.12em]">
                            {block.title}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {block.description}
                          </p>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 text-primary" />
                      </button>
                    );
                  }

                  return (
                    <div
                      key={block.id}
                      aria-hidden="true"
                      className={`rounded-2xl border px-4 py-4 opacity-65 ${toneClass}`}
                    >
                      <p className="font-display text-sm uppercase tracking-[0.12em]">
                        {block.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {block.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <Card className="rounded-[32px] border border-border/70 bg-card/95 shadow-[0_32px_100px_-48px_rgba(0,0,0,0.72)]">
            <CardHeader className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {activeStep.sectionTitle}
              </p>
              <CardTitle className="font-display text-2xl uppercase tracking-[0.12em]">
                {activeStep.stepTitle}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed sm:text-base">
                {activeStep.instruction}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background/55 p-4 text-sm text-muted-foreground">
                Tap the highlighted action:{" "}
                <span className="font-semibold text-foreground">
                  {activeStep.hotspotLabel}
                </span>
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
  );
}
