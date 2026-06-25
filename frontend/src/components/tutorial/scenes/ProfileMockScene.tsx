import { UserRound, KeyRound, LifeBuoy, ChevronRight, Mail } from "lucide-react";
import { MockHotspot } from "@/components/tutorial/MockHotspot";
import type { TutorialStepDefinition } from "@/lib/tutorials/tutorialDefinitions";

interface ProfileMockSceneProps {
  step: TutorialStepDefinition;
  onAdvance: () => void;
}

export function ProfileMockScene({ step, onAdvance }: ProfileMockSceneProps) {
  const isAccountDetails = step.id === "profile-account-details";
  const isAccessCode = step.id === "profile-access-code";
  const isHelp = step.id === "profile-help";

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
      <div className="border-b border-border/60 bg-card/90 px-4 py-3">
        <p className="font-display text-sm font-semibold">My Profile</p>
        <p className="text-[9px] text-muted-foreground">Inspector account center</p>
      </div>

      {/* Avatar + name hero */}
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/40 bg-[hsl(var(--primary)/0.16)]">
          <span className="font-display text-lg font-bold text-primary">JD</span>
        </div>
        <div className="text-center">
          <p className="font-display text-sm font-semibold">Juan Dela Cruz</p>
          <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
            Inspector
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-4">
        {/* Account details row */}
        <MockHotspot
          active={isAccountDetails}
          onAdvance={onAdvance}
          label="Tap here"
        >
          <div className="rounded-xl border border-border/60 bg-card/90 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-[hsl(var(--primary)/0.1)]">
                  <UserRound className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="font-display text-[10px] font-semibold uppercase tracking-wider">
                    Account Details
                  </p>
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <Mail className="h-2.5 w-2.5" />
                    <span>juan@botchabuster.ph</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </MockHotspot>

        {/* Inspector code row */}
        <MockHotspot
          active={isAccessCode}
          onAdvance={onAdvance}
          label="Tap here"
        >
          <div className="rounded-xl border border-border/60 bg-card/90 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-[hsl(var(--primary)/0.1)]">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="font-display text-[10px] font-semibold uppercase tracking-wider">
                    Inspector Code
                  </p>
                  <p className="font-mono text-[9px] text-muted-foreground">INS-2024-0042</p>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </MockHotspot>

        {/* Help tutorials row */}
        <MockHotspot
          active={isHelp}
          onAdvance={onAdvance}
          label="Tap here"
        >
          <div className="rounded-xl border border-border/60 bg-card/90 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-[hsl(var(--primary)/0.1)]">
                  <LifeBuoy className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="font-display text-[10px] font-semibold uppercase tracking-wider">
                    Help Tutorials
                  </p>
                  <p className="text-[9px] text-muted-foreground">Replay guided demos anytime</p>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </MockHotspot>
      </div>
    </div>
  );
}
