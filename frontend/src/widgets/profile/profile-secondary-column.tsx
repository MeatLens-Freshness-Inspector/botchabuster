import { Button } from "@/shared/ui";
import { PreferencesAccountCard } from "@/features/profile-editing/ui/preferences-account-card";

type ProfileSecondaryColumnProps = {
  isLightMode: boolean;
  isShowingDetailedResults: boolean;
  onOpenPrivacyDialog: () => void;
  onOpenSignOutConfirm: () => void;
  onOpenTermsDialog: () => void;
  onDetailedResultsChange: (value: boolean) => void;
  onLightModeChange: (value: boolean) => void;
};

export function ProfileSecondaryColumn({
  isLightMode,
  isShowingDetailedResults,
  onOpenPrivacyDialog,
  onOpenSignOutConfirm,
  onOpenTermsDialog,
  onDetailedResultsChange,
  onLightModeChange,
}: ProfileSecondaryColumnProps) {
  return (
    <div data-testid="profile-secondary-column" className="space-y-4 lg:space-y-0 lg:contents">
      <section
        data-testid="profile-terms-card"
        className="order-4 h-full rounded-3xl border border-border/70 bg-card/90 p-4"
      >
        <h3 className="mb-3 font-display text-lg font-semibold">Terms and Conditions Reminder</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          MeatLens is an AI-assisted support tool. Final inspection decisions must still follow professional standards and official LGU or institutional protocols.
        </p>
        <Button type="button" variant="outline" className="mt-3 h-10 rounded-xl border-border/80 text-xs uppercase tracking-wider" onClick={onOpenTermsDialog}>
          View Terms and Conditions
        </Button>
      </section>

      <section
        data-testid="profile-policy-card"
        className="order-6 h-full rounded-3xl border border-border/70 bg-card/90 p-4"
      >
        <h3 className="mb-3 font-display text-lg font-semibold">Privacy Policy</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Review how MeatLens collects, uses, and protects your data.
        </p>
        <Button type="button" variant="outline" className="mt-3 h-10 rounded-xl border-border/80 text-xs uppercase tracking-wider" onClick={onOpenPrivacyDialog}>
          View Privacy Policy
        </Button>
      </section>

      <PreferencesAccountCard
        isLightMode={isLightMode}
        isShowingDetailedResults={isShowingDetailedResults}
        onDetailedResultsChange={onDetailedResultsChange}
        onLightModeChange={onLightModeChange}
        onOpenSignOutConfirm={onOpenSignOutConfirm}
      />
    </div>
  );
}
