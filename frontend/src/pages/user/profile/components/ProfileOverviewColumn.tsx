import type { ChangeEventHandler } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarDays,
  Copy,
  LifeBuoy,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Profile } from "@/integrations/api/ProfileClient";
import { ProfileEditableDetailsCard } from "./ProfileEditableDetailsCard";

type ProfileOverviewColumnProps = {
  email: string;
  fullName: string;
  initials: string;
  inspectorCode: string;
  isLightMode: boolean;
  isSavingProfile: boolean;
  isShowingDetailedResults: boolean;
  isUploadingAvatar: boolean;
  onAvatarUpload: ChangeEventHandler<HTMLInputElement>;
  onCopyCode: () => void | Promise<void>;
  onEmailChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onOpenHelpTutorials: () => void;
  onOpenPrivacyDialog: () => void;
  onOpenProfileTutorial: () => void;
  onOpenTermsDialog: () => void;
  onSaveProfile: () => void | Promise<void>;
  profile: Profile | null;
  roleLabel: string;
};

export function ProfileOverviewColumn({
  email,
  fullName,
  initials,
  inspectorCode,
  isLightMode,
  isSavingProfile,
  isShowingDetailedResults,
  isUploadingAvatar,
  onAvatarUpload,
  onCopyCode,
  onEmailChange,
  onFullNameChange,
  onOpenHelpTutorials,
  onOpenPrivacyDialog,
  onOpenProfileTutorial,
  onOpenTermsDialog,
  onSaveProfile,
  profile,
  roleLabel,
}: ProfileOverviewColumnProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border/70 bg-card/95 p-4 shadow-[0_20px_65px_-34px_rgba(0,0,0,0.65)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16 border-2 border-border/80">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt="Profile avatar" />
              <AvatarFallback className="font-display text-base uppercase tracking-wider">
                {initials || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-display text-2xl font-semibold leading-tight">
                {fullName || "Unnamed User"}
              </h2>
              <p className="text-sm text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-display uppercase tracking-widest text-primary">
            Active
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground"
          >
            <Mail className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-1 rounded-xl border border-border/70 bg-background/55 p-3">
            <Label
              htmlFor="profile-image"
              className="text-[11px] uppercase tracking-widest text-muted-foreground"
            >
              Profile Image
            </Label>
            <Input
              id="profile-image"
              type="file"
              accept="image/*"
              onChange={onAvatarUpload}
              disabled={isUploadingAvatar}
              className="h-9 text-xs"
            />
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Access Code
              </div>
              {profile?.inspector_code && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[11px]"
                  onClick={onCopyCode}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
              )}
            </div>
            <p className="break-words font-display text-sm tracking-widest">{inspectorCode}</p>
          </div>
        </div>
      </section>

      <ProfileEditableDetailsCard
        email={email}
        fullName={fullName}
        inspectorCode={inspectorCode}
        isLightMode={isLightMode}
        isSavingProfile={isSavingProfile}
        isShowingDetailedResults={isShowingDetailedResults}
        isUploadingAvatar={isUploadingAvatar}
        onEmailChange={onEmailChange}
        onFullNameChange={onFullNameChange}
        onSaveProfile={onSaveProfile}
      />

      <section className="rounded-3xl border border-border/70 bg-card/90 p-4">
        <h3 className="mb-3 font-display text-lg font-semibold">
          Terms and Conditions Reminder
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          MeatLens is an AI-assisted support tool. Final inspection decisions must
          still follow professional standards and official LGU or institutional protocols.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-10 rounded-xl border-border/80 text-xs uppercase tracking-wider"
          onClick={onOpenTermsDialog}
        >
          View Terms and Conditions
        </Button>
      </section>

      <section className="rounded-3xl border border-border/70 bg-card/90 p-4">
        <h3 className="mb-3 font-display text-lg font-semibold">Privacy Policy</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Review how MeatLens collects, uses, and protects your data.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-10 rounded-xl border-border/80 text-xs uppercase tracking-wider"
          onClick={onOpenPrivacyDialog}
        >
          View Privacy Policy
        </Button>
      </section>

      <section className="rounded-3xl border border-border/70 bg-card/90 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">Tutorials</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Reopen the full onboarding walkthrough or jump into focused demo replays
              whenever you need a refresher.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-2xl border border-primary/20 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_52%),linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--background)/0.74))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary/90">
                  Full Walkthrough
                </p>
                <p className="mt-1 font-display text-base font-semibold">
                  Replay the complete onboarding tutorial
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Run the same safety, profile, inspect, and history sequence from your
                  profile tab without changing your account state.
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-[hsl(var(--primary)/0.14)]">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
            </div>
            <Button
              type="button"
              className="mt-4 h-10 rounded-xl px-5 font-display text-xs uppercase tracking-[0.16em]"
              onClick={onOpenProfileTutorial}
            >
              Replay Full Tutorial
            </Button>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Quick Demos
                </p>
                <p className="mt-1 font-display text-base font-semibold">
                  Open the tutorial library
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Jump straight to Inspect, History, safety reminders, or profile
                  orientation demos.
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/70">
                <LifeBuoy className="h-5 w-5 text-primary" />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-10 rounded-xl border-border/80 px-5 text-xs uppercase tracking-[0.16em]"
              onClick={onOpenHelpTutorials}
            >
              Open Help Tutorials
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
