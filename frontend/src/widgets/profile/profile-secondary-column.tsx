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
        data-testid="profile-legal-card"
        className="order-4 rounded-3xl border border-border/70 bg-card/90 p-4 lg:h-full"
      >
        <h3 className="mb-3 font-display text-lg font-semibold">Legal</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Review the MeatLens terms and how the application collects, uses, and protects your data.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-10 rounded-xl border-border/80 text-xs uppercase tracking-wider" onClick={onOpenTermsDialog}>
            View Terms and Conditions
          </Button>
          <Button type="button" variant="outline" className="h-10 rounded-xl border-border/80 text-xs uppercase tracking-wider" onClick={onOpenPrivacyDialog}>
            View Privacy Policy
          </Button>
        </div>
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
