import { LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type ProfileSecondaryColumnProps = {
  isLightMode: boolean;
  isSavingInspectPreference: boolean;
  isShowingDetailedResults: boolean;
  onDetailedResultsToggle: (checked: boolean) => void | Promise<void>;
  onOpenPrivacyDialog: () => void;
  onOpenSignOutConfirm: () => void;
  onOpenTermsDialog: () => void;
  onThemeToggle: () => void | Promise<void>;
};

export function ProfileSecondaryColumn({
  isLightMode,
  isSavingInspectPreference,
  isShowingDetailedResults,
  onDetailedResultsToggle,
  onOpenPrivacyDialog,
  onOpenSignOutConfirm,
  onOpenTermsDialog,
  onThemeToggle,
}: ProfileSecondaryColumnProps) {
  return (
    <div data-testid="profile-secondary-column" className="space-y-4">
      <section
        data-testid="profile-actions-card"
        className="rounded-3xl border border-border/70 bg-card/92 p-4"
      >
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

      <section
        data-testid="profile-terms-card"
        className="rounded-3xl border border-border/70 bg-card/90 p-4"
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
        className="rounded-3xl border border-border/70 bg-card/90 p-4"
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
