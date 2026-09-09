import React from "react";
import { ChevronRight, KeyRound, LifeBuoy, Mail, UserRound } from "lucide-react";
import { tutorialFixtures } from "../../model/tutorial-fixtures";
import type { TutorialStepDefinition } from "../../model/inspection-tutorial";
import { MockHotspot } from "../mock-hotspot";
import { TutorialAppShell } from "../tutorial-app-shell";

interface ProfileMockSceneProps {
  step: TutorialStepDefinition;
  onAdvance: () => void;
}

export function ProfileMockScene({ step, onAdvance }: ProfileMockSceneProps) {
  const fixture = tutorialFixtures.profile;
  const rows = [
    { id: "account", title: "Account Details", icon: UserRound, detail: fixture.emailLabel, active: step.id === "profile-account-details" },
    { id: "code", title: "Inspector Code", icon: KeyRound, detail: fixture.accessCodeLabel, active: step.id === "profile-access-code" },
    { id: "help", title: "Help Tutorials", icon: LifeBuoy, detail: "Replay guided demos anytime", active: step.id === "profile-help" },
  ];

  return (
    <TutorialAppShell activeTab="profile" title="My Profile" subtitle="Inspector account center">
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/40 bg-[hsl(var(--primary)/0.16)]">
          <span className="font-display text-lg font-bold text-primary">TE</span>
        </div>
        <div className="text-center">
          <p className="font-display text-sm font-semibold">{fixture.displayName}</p>
          <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">Inspector</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 px-3 pb-4">
        {rows.map(({ id, title, icon: Icon, detail, active }) => (
          <MockHotspot key={id} active={active} onAdvance={onAdvance} label="Tap here" ariaLabel={step.hotspotLabel}>
            <div className="rounded-xl border border-border/60 bg-card/90 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-[hsl(var(--primary)/0.1)]"><Icon className="h-3.5 w-3.5 text-primary" /></div>
                  <div>
                    <p className="font-display text-[10px] font-semibold uppercase tracking-wider">{title}</p>
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      {id === "account" && <Mail className="h-2.5 w-2.5" />}
                      <span>{detail}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          </MockHotspot>
        ))}
      </div>
    </TutorialAppShell>
  );
}
