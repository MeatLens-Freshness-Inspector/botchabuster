import { KeyRound, Loader2 } from "lucide-react";
import { Button, Input, Label } from "@/shared/ui";

type PasswordChangeCardProps = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isSaving: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
};

export function PasswordChangeCard({
  currentPassword,
  newPassword,
  confirmPassword,
  isSaving,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: PasswordChangeCardProps) {
  return (
    <section
      data-testid="profile-password-card"
      className="flex flex-col rounded-3xl border border-border/70 bg-card/92 p-4 lg:min-h-[18rem]"
    >
      <div>
        <h3 className="font-display text-lg font-semibold">Change Password</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Confirm your current password before choosing a new one.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => onCurrentPasswordChange(event.target.value)}
            autoComplete="current-password"
            className="h-11 rounded-xl bg-background/60"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => onNewPasswordChange(event.target.value)}
            autoComplete="new-password"
            className="h-11 rounded-xl bg-background/60"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            autoComplete="new-password"
            className="h-11 rounded-xl bg-background/60"
          />
        </div>
      </div>

      <div className="mt-auto flex justify-end pt-4">
        <Button
          onClick={onSubmit}
          disabled={isSaving}
          className="h-11 rounded-xl px-5"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
          Change Password
        </Button>
      </div>
    </section>
  );
}
