import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { profileClient } from "@/integrations/api/ProfileClient";
import { Input } from "@/components/ui/input";
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
  const { user, profile, setProfileState, updateEmail } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [acceptedSafety, setAcceptedSafety] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const currentStep = coreSteps[stepIndex] ?? "welcome";
  const progressLabel = useMemo(
    () => `Step ${Math.min(stepIndex + 1, coreSteps.length)} of ${coreSteps.length}`,
    [stepIndex],
  );

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setEmail(user?.email ?? "");
  }, [profile?.full_name, user?.email]);

  const handleContinue = async () => {
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
      return;
    }

    if (currentStep === "profile") {
      if (!user) return;

      const trimmedName = fullName.trim();
      const trimmedEmail = email.trim();

      if (!trimmedName || !trimmedEmail) {
        setStepError("Full name and email are required.");
        return;
      }

      setIsSavingProfile(true);
      setStepError(null);

      try {
        if (trimmedName !== (profile?.full_name ?? "")) {
          const updatedProfile = await profileClient.updateProfile(user.id, {
            full_name: trimmedName,
          });
          setProfileState(updatedProfile);
        }

        if (trimmedEmail !== (user.email ?? "")) {
          await updateEmail(trimmedEmail);
        }

        setStepIndex(3);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save profile";
        setStepError(message);
        toast.error(message);
      } finally {
        setIsSavingProfile(false);
      }
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
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
                  <Label htmlFor="onboarding-full-name" className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Full Name
                  </Label>
                  <Input
                    id="onboarding-full-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="mt-2 bg-background/65"
                  />
                </div>
                <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)] p-3">
                  <Label htmlFor="onboarding-email" className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    id="onboarding-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 bg-background/65"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Inspector Code</p>
                <p className="mt-1 font-display text-sm tracking-widest">{profile?.inspector_code ?? "No assigned code"}</p>
              </div>
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
              disabled={stepIndex === 0 || isSavingProfile}
              onClick={() => {
                setStepError(null);
                setStepIndex((current) => Math.max(current - 1, 0));
              }}
            >
              Back
            </Button>
            <Button type="button" onClick={() => void handleContinue()} disabled={isSavingProfile}>
              {currentStep === "welcome" ? "Begin Setup" : currentStep === "profile" ? "Save and Continue" : "Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingPage;
