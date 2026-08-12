import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/shared/ui";
import { Button, Input, Label } from "@/shared/ui";
import { validatePasswordChange } from "@/features/profile-editing/model/profile-settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

type PasswordChangeDialogProps = {
  open: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isSaving: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void | Promise<boolean>;
};

export function PasswordChangeDialog({
  open,
  currentPassword,
  newPassword,
  confirmPassword,
  isSaving,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onOpenChange,
  onSubmit,
}: PasswordChangeDialogProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmOpen(false);
      setFormError(null);
      setShowSuccess(false);
    }
  }, [open]);

  const handleConfirmedSubmit = async () => {
    const updated = await onSubmit();
    setConfirmOpen(false);
    if (updated) {
      setShowSuccess(true);
    }
  };

  const handleReviewChange = () => {
    const validationError = validatePasswordChange({ currentPassword, newPassword, confirmPassword });
    setFormError(validationError);
    if (!validationError) {
      setConfirmOpen(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent data-testid="profile-password-dialog" className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new password for your account.
            </DialogDescription>
          </DialogHeader>

          {showSuccess ? (
            <p role="status" className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
              Password changed successfully.
            </p>
          ) : (
            <div className="space-y-3">
              {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input id="current-password" type="password" value={currentPassword} onChange={(event) => onCurrentPasswordChange(event.target.value)} autoComplete="current-password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(event) => onNewPasswordChange(event.target.value)} autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => onConfirmPasswordChange(event.target.value)} autoComplete="new-password" />
              </div>
            </div>
          )}

          {!showSuccess ? (
            <DialogFooter>
              <Button type="button" onClick={handleReviewChange} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Change Password
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Change your password?"
        description="Are you sure you want to change your password? You will use the new password the next time you sign in."
        confirmLabel="Change Password"
        onConfirm={() => void handleConfirmedSubmit()}
      />
    </>
  );
}
