import { Button } from "@/shared/ui";
import { AccountActionsCard } from "@/features/profile-editing/ui/account-actions-card";

type ProfileSecondaryColumnProps = {
  onOpenPrivacyDialog: () => void;
  onOpenSignOutConfirm: () => void;
  onOpenTermsDialog: () => void;
};

export function ProfileSecondaryColumn({
  onOpenPrivacyDialog,
  onOpenSignOutConfirm,
  onOpenTermsDialog,
}: ProfileSecondaryColumnProps) {
  return (
    <div data-testid="profile-secondary-column" className="space-y-4">
      <AccountActionsCard onOpenSignOutConfirm={onOpenSignOutConfirm} />

      <section
        data-testid="profile-terms-card"
        className="rounded-3xl border border-border/70 bg-card/90 p-4 lg:min-h-[18rem]"
      >
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

      <section
        data-testid="profile-policy-card"
        className="rounded-3xl border border-border/70 bg-card/90 p-4 lg:min-h-[18rem]"
      >
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
    </div>
  );
}
