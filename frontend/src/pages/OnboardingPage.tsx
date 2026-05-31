import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const coreSteps = ["welcome", "safety", "profile", "inspect", "history"] as const;

type CoreStep = (typeof coreSteps)[number];

const stepTitles: Record<CoreStep, string> = {
  welcome: "Welcome to MeatLens",
  safety: "Safety and Usage",
  profile: "Confirm Profile",
  inspect: "How Inspect Works",
  history: "How History Works",
};

const stepDescriptions: Record<CoreStep, string> = {
  welcome: "Let's complete a short first-time setup before you begin inspecting.",
  safety: "MeatLens supports your inspection work, but official protocols still decide the final outcome.",
  profile: "Review your account details before entering the app.",
  inspect: "Inspect guidance will be added in the next task.",
  history: "History guidance will be added in the next task.",
};

const OnboardingPage = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [acceptedSafety, setAcceptedSafety] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const currentStep = coreSteps[stepIndex] ?? "welcome";
  const progressLabel = useMemo(
    () => `Step ${Math.min(stepIndex + 1, coreSteps.length)} of ${coreSteps.length}`,
    [stepIndex],
  );

  const handleContinue = () => {
    if (currentStep === "welcome") {
      setStepError(null);
      setStepIndex(1);
      return;
    }

    if (currentStep === "safety") {
      if (!acceptedSafety) {
        setStepError("Please acknowledge the usage notice before continuing.");
        return;
      }

      setStepError(null);
      setStepIndex(2);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] p-4">
      <Card className="w-full max-w-xl rounded-3xl border border-border/70 bg-card/95 shadow-[0_26px_80px_-36px_rgba(0,0,0,0.7)]">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)]">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{progressLabel}</p>
            <CardTitle className="font-display text-2xl uppercase tracking-wider sm:text-3xl">
              {stepTitles[currentStep]}
            </CardTitle>
            <CardDescription className="mx-auto max-w-md text-sm sm:text-base">
              {stepDescriptions[currentStep]}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStep === "welcome" && (
            <div className="rounded-2xl border border-border/70 bg-background/55 p-4 text-sm leading-relaxed text-muted-foreground">
              This setup is only shown to inspectors the first time they sign in after account verification.
            </div>
          )}

          {currentStep === "safety" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background/55 p-4 text-sm leading-relaxed text-muted-foreground">
                MeatLens is a decision-support tool. Final inspection decisions must still follow your official LGU or
                institutional process.
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/55 p-4">
                <Checkbox
                  id="accept-safety"
                  checked={acceptedSafety}
                  onCheckedChange={(checked) => {
                    const nextValue = Boolean(checked);
                    setAcceptedSafety(nextValue);
                    if (nextValue) {
                      setStepError(null);
                    }
                  }}
                />
                <Label htmlFor="accept-safety" className="text-sm leading-relaxed">
                  I understand that MeatLens assists inspections and does not replace official judgment or protocol.
                </Label>
              </div>
            </div>
          )}

          {currentStep === "profile" && (
            <div className="rounded-2xl border border-border/70 bg-background/55 p-4 text-sm leading-relaxed text-muted-foreground">
              Profile confirmation is the next step and will be added after this shell is in place.
            </div>
          )}

          {stepError ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {stepError}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={stepIndex === 0}
              onClick={() => {
                setStepError(null);
                setStepIndex((current) => Math.max(current - 1, 0));
              }}
            >
              Back
            </Button>
            <Button type="button" onClick={handleContinue}>
              {currentStep === "welcome" ? "Begin Setup" : "Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingPage;
