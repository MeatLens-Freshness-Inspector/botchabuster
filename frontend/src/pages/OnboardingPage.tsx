import { useEffect, useMemo, useState } from "react";
import { MessageSquare, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { profileClient } from "@/integrations/api/ProfileClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { markOnboardingSkippedForSession } from "@/lib/onboardingSession";

const coreSteps = ["welcome", "safety", "profile", "inspect", "history"] as const;

type CoreStep = (typeof coreSteps)[number];

type OnboardingStep = CoreStep | "complete";

const inspectGuide = [
  { title: "Select a Market", description: "Choose the active inspection location before capture." },
  { title: "Capture the Sample", description: "Use the guided camera flow to frame the meat sample." },
  { title: "Run Analysis", description: "Review the classification and confidence before saving." },
  { title: "Save the Record", description: "Persist the inspection once you are satisfied with the result." },
];

const historyGuide = [
  { title: "Review Past Records", description: "Open History to revisit saved inspections." },
  { title: "Check Confidence", description: "Use stored classifications and confidence to support follow-up." },
  { title: "Track Traceability", description: "Use past records when you need to compare or confirm findings." },
];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, profile, setProfileState, updateEmail } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [acceptedSafety, setAcceptedSafety] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const currentStep: OnboardingStep = stepIndex >= coreSteps.length ? "complete" : coreSteps[stepIndex];
  const progressLabel = useMemo(
    () => `Step ${Math.min(stepIndex + 1, coreSteps.length)} of ${coreSteps.length}`,
    [stepIndex],
  );
  const heading =
    currentStep === "welcome"
      ? "Welcome to MeatLens"
      : currentStep === "safety"
        ? "Safety and Usage"
        : currentStep === "profile"
          ? "Confirm Profile"
          : currentStep === "inspect"
            ? "How Inspect Works"
            : currentStep === "history"
              ? "How History Works"
              : "Setup Complete";
  const description =
    currentStep === "welcome"
      ? "Let's complete a short first-time setup before you begin inspecting."
      : currentStep === "safety"
        ? "MeatLens supports your inspection work, but official protocols still decide the final outcome."
        : currentStep === "profile"
          ? "Review and confirm your account details before entering the app."
          : currentStep === "inspect"
            ? "This is the core field workflow you will use every time you inspect."
            : currentStep === "history"
              ? "History helps you review saved findings after the capture session ends."
              : "Optional tools are below. Your required setup is finished.";

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setEmail(user?.email ?? "");
  }, [profile?.full_name, user?.email]);

  const handleSkipForNow = () => {
    if (!user) return;

    markOnboardingSkippedForSession(user.id);
    navigate("/inspect", { replace: true });
  };

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

      return;
    }

    if (currentStep === "inspect") {
      setStepError(null);
      setStepIndex(4);
      return;
    }

    if (currentStep === "history") {
      setStepError(null);
      setStepIndex(5);
    }
  };

  const handleFinish = async () => {
    if (!user) return;

    setIsCompleting(true);
    setStepError(null);

    try {
      const updatedProfile = await profileClient.updateProfile(user.id, {
        onboarding_completed_at: new Date().toISOString(),
      });
      setProfileState(updatedProfile);
      navigate("/inspect", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to finish onboarding";
      setStepError(message);
      toast.error(message);
    } finally {
      setIsCompleting(false);
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
            <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <p>{progressLabel}</p>
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2 text-[11px] uppercase tracking-[0.16em]"
                onClick={handleSkipForNow}
              >
                Skip for now
              </Button>
            </div>
            <CardTitle className="font-display text-2xl uppercase tracking-wider sm:text-3xl">
              {heading}
            </CardTitle>
            <CardDescription className="mx-auto max-w-md text-sm sm:text-base">
              {description}
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

          {currentStep === "inspect" && (
            <div className="grid gap-3">
              {inspectGuide.map((item) => (
                <div key={item.title} className="rounded-2xl border border-border/70 bg-background/55 p-4">
                  <p className="font-display text-sm uppercase tracking-wider">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          )}

          {currentStep === "history" && (
            <div className="grid gap-3">
              {historyGuide.map((item) => (
                <div key={item.title} className="rounded-2xl border border-border/70 bg-background/55 p-4">
                  <p className="font-display text-sm uppercase tracking-wider">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          )}

          {currentStep === "complete" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)] p-4">
                <p className="font-display text-sm uppercase tracking-wider">You're Ready</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your required setup is complete. You can start inspecting now and come back to optional tools later.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <p className="font-display text-sm uppercase tracking-wider">Messages</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use Messages when you need to coordinate with admins or other users.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-primary" />
                    <p className="font-display text-sm uppercase tracking-wider">Profile</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use Profile to review your account details, inspector code, and personal settings.
                  </p>
                </div>
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
              disabled={stepIndex === 0 || isSavingProfile || isCompleting}
              onClick={() => {
                setStepError(null);
                setStepIndex((current) => Math.max(current - 1, 0));
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={currentStep === "complete" ? () => void handleFinish() : () => void handleContinue()}
              disabled={isSavingProfile || isCompleting}
            >
              {currentStep === "welcome"
                ? "Begin Setup"
                : currentStep === "profile"
                  ? "Save and Continue"
                  : currentStep === "complete"
                    ? "Start Inspecting"
                    : "Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingPage;
