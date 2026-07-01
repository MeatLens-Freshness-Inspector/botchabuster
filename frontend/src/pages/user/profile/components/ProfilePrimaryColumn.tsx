import { Loader2, KeyRound, LifeBuoy, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RegisteredPasskey } from "@/integrations/api/PasskeyClient";
import { ProfileEditableDetailsCard } from "./ProfileEditableDetailsCard";

type ProfilePrimaryColumnProps = {
  email: string;
  fullName: string;
  inspectorCode: string;
  isLightMode: boolean;
  isLoadingPasskeys: boolean;
  isRegisteringPasskey: boolean;
  isSavingPassword: boolean;
  isSavingProfile: boolean;
  isShowingDetailedResults: boolean;
  isUploadingAvatar: boolean;
  passkeyAvailable: boolean;
  passkeys: RegisteredPasskey[];
  password: string;
  removingCredentialId: string | null;
  onEmailChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onOpenHelpTutorials: () => void;
  onOpenProfileTutorial: () => void;
  onPasswordChange: (value: string) => void;
  onRegisterPasskey: () => void | Promise<void>;
  onRemovePasskey: (credentialId: string) => void | Promise<void>;
  onSaveProfile: () => void | Promise<void>;
  onUpdatePassword: () => void | Promise<void>;
};

export function ProfilePrimaryColumn({
  email,
  fullName,
  inspectorCode,
  isLightMode,
  isLoadingPasskeys,
  isRegisteringPasskey,
  isSavingPassword,
  isSavingProfile,
  isShowingDetailedResults,
  isUploadingAvatar,
  passkeyAvailable,
  passkeys,
  password,
  removingCredentialId,
  onEmailChange,
  onFullNameChange,
  onOpenHelpTutorials,
  onOpenProfileTutorial,
  onPasswordChange,
  onRegisterPasskey,
  onRemovePasskey,
  onSaveProfile,
  onUpdatePassword,
}: ProfilePrimaryColumnProps) {
  return (
    <div data-testid="profile-primary-column" className="space-y-4">
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

      <section
        data-testid="profile-password-card"
        className="rounded-3xl border border-border/70 bg-card/92 p-4"
      >
        <h3 className="font-display text-lg font-semibold">Password Reset Section</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Change password directly while signed in.
        </p>
        <div className="mt-4 space-y-3">
          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Enter new password"
            className="h-11 rounded-xl bg-background/60"
          />
          <Button
            onClick={onUpdatePassword}
            disabled={isSavingPassword}
            className="h-11 rounded-xl px-5"
          >
            {isSavingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update Password
          </Button>
        </div>
      </section>

      <section
        data-testid="profile-passkeys-card"
        className="rounded-3xl border border-border/70 bg-card/92 p-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">Passkeys and Device Unlock</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Register this device for faster sign-in with fingerprint, face
              recognition, or platform unlock.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-border/80 text-xs uppercase tracking-wider"
            onClick={onRegisterPasskey}
            disabled={!passkeyAvailable || isRegisteringPasskey}
          >
            {isRegisteringPasskey ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Enroll This Device
          </Button>
        </div>

        {!passkeyAvailable ? (
          <p className="mt-3 rounded-2xl border border-border/70 bg-background/50 px-3 py-3 text-sm text-muted-foreground">
            Passkeys are not available on this browser or device.
          </p>
        ) : null}

        {isLoadingPasskeys ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading registered devices
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {passkeys.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/45 px-4 py-4 text-sm text-muted-foreground">
                No passkeys enrolled yet.
              </div>
            ) : (
              passkeys.map((passkey) => (
                <div
                  key={passkey.credentialId}
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/50 px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{passkey.deviceLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {passkey.localDeviceReady
                        ? "Local device unlock ready"
                        : "Online passkey only"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-start text-destructive hover:text-destructive"
                    onClick={() => void onRemovePasskey(passkey.credentialId)}
                    disabled={removingCredentialId === passkey.credentialId}
                    aria-label={`Remove ${passkey.deviceLabel}`}
                  >
                    {removingCredentialId === passkey.credentialId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <section
        data-testid="profile-tutorials-card"
        className="rounded-3xl border border-border/70 bg-card/90 p-4"
      >
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
