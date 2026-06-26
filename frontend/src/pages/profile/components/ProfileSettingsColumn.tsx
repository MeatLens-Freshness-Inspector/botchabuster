import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, LogOut, KeyRound, Moon, Sun, Trash2, UserRound } from "lucide-react";
import type { RegisteredPasskey } from "@/integrations/api/PasskeyClient";

type ProfileSettingsColumnProps = {
  email: string;
  fullName: string;
  isLightMode: boolean;
  isLoadingPasskeys: boolean;
  isRegisteringPasskey: boolean;
  isSavingInspectPreference: boolean;
  isSavingPassword: boolean;
  isSavingProfile: boolean;
  isShowingDetailedResults: boolean;
  isUploadingAvatar: boolean;
  passkeyAvailable: boolean;
  passkeys: RegisteredPasskey[];
  password: string;
  removingCredentialId: string | null;
  onDetailedResultsToggle: (checked: boolean) => void | Promise<void>;
  onEmailChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onOpenSignOutConfirm: () => void;
  onPasswordChange: (value: string) => void;
  onRegisterPasskey: () => void | Promise<void>;
  onRemovePasskey: (credentialId: string) => void | Promise<void>;
  onSaveProfile: () => void | Promise<void>;
  onThemeToggle: () => void | Promise<void>;
  onUpdatePassword: () => void | Promise<void>;
};

export function ProfileSettingsColumn({
  email,
  fullName,
  isLightMode,
  isLoadingPasskeys,
  isRegisteringPasskey,
  isSavingInspectPreference,
  isSavingPassword,
  isSavingProfile,
  isShowingDetailedResults,
  isUploadingAvatar,
  passkeyAvailable,
  passkeys,
  password,
  removingCredentialId,
  onDetailedResultsToggle,
  onEmailChange,
  onFullNameChange,
  onOpenSignOutConfirm,
  onPasswordChange,
  onRegisterPasskey,
  onRemovePasskey,
  onSaveProfile,
  onThemeToggle,
  onUpdatePassword,
}: ProfileSettingsColumnProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border/70 bg-card/92 p-4 shadow-[0_18px_55px_-34px_rgba(0,0,0,0.55)]">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
            <Label
              htmlFor="fullName"
              className="text-[11px] uppercase tracking-widest text-muted-foreground"
            >
              Name
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => onFullNameChange(event.target.value)}
              className="mt-2 bg-background/65"
            />
          </div>
          <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.14)] p-3">
            <Label
              htmlFor="email"
              className="text-[11px] uppercase tracking-widest text-muted-foreground"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className="mt-2 bg-background/65"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            onClick={onSaveProfile}
            disabled={isSavingProfile || isUploadingAvatar}
            className="h-10 rounded-xl px-5 font-display text-xs uppercase tracking-widest"
          >
            {isSavingProfile ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserRound className="mr-2 h-4 w-4" />
            )}
            Save Profile
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-3xl border border-border/70 bg-card/92 p-4">
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

        <section className="rounded-3xl border border-border/70 bg-card/92 p-4">
          <h3 className="font-display text-base font-semibold">Actions</h3>
          <div className="mt-4 space-y-2">
            <div className="rounded-2xl border border-border/80 bg-background/55 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Inspect Result Complexity
                  </p>
                  <p className="text-sm text-foreground">
                    {isShowingDetailedResults
                      ? "Show detailed technical metrics"
                      : "Show only classification, confidence, and explanation"}
                  </p>
                </div>
                <Switch
                  checked={isShowingDetailedResults}
                  onCheckedChange={(checked) => void onDetailedResultsToggle(checked)}
                  disabled={isSavingInspectPreference}
                  aria-label="Toggle detailed inspect results"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onThemeToggle}
              className="h-11 w-full justify-start gap-2 rounded-xl border border-border/80"
            >
              {isLightMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {isLightMode ? "Switch to Dark" : "Switch to Light"}
            </Button>
            <Button
              variant="outline"
              onClick={onOpenSignOutConfirm}
              className="h-11 w-full justify-start gap-2 rounded-xl border border-border/80"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-border/70 bg-card/92 p-4">
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
    </div>
  );
}
