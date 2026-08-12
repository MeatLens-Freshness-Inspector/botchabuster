import { LogOut } from "lucide-react";
import { Button, Label } from "@/shared/ui";
import { Switch } from "@/shared/ui/switch";

type PreferencesAccountCardProps = {
  isLightMode: boolean;
  isShowingDetailedResults: boolean;
  onDetailedResultsChange: (value: boolean) => void;
  onLightModeChange: (value: boolean) => void;
  onOpenSignOutConfirm: () => void;
};

export function PreferencesAccountCard({
  isLightMode,
  isShowingDetailedResults,
  onDetailedResultsChange,
  onLightModeChange,
  onOpenSignOutConfirm,
}: PreferencesAccountCardProps) {
  return (
    <section
      data-testid="profile-preferences-account-card"
      className="order-2 flex flex-col rounded-3xl border border-border/70 bg-card/92 p-4 lg:h-full"
    >
      <div>
        <h3 className="font-display text-lg font-semibold">Preferences and Account</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose how MeatLens looks and how much inspection detail it shows, or sign out.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <div data-testid="profile-theme-preference" className="flex h-16 items-center justify-between rounded-2xl border border-border/70 bg-background/55 p-3">
          <div className="space-y-1">
            <Label htmlFor="profile-details-theme" className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Theme
            </Label>
            <p className="text-sm text-foreground">{isLightMode ? "Light mode" : "Dark mode"}</p>
          </div>
          <Switch
            id="profile-details-theme"
            checked={isLightMode}
            onCheckedChange={onLightModeChange}
            aria-label="Use light mode"
          />
        </div>

        <div data-testid="profile-results-preference" className="flex h-16 items-center justify-between rounded-2xl border border-border/70 bg-background/55 p-3">
          <div className="space-y-1">
            <Label htmlFor="profile-details-results" className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Inspect Result Detail
            </Label>
            <p className="text-sm text-foreground">
              {isShowingDetailedResults ? "Detailed" : "Simplified"}
            </p>
          </div>
          <Switch
            id="profile-details-results"
            checked={isShowingDetailedResults}
            onCheckedChange={onDetailedResultsChange}
            aria-label="Show detailed inspect results"
          />
        </div>
      </div>

      <Button
        data-testid="profile-sign-out-button"
        type="button"
        variant="outline"
        onClick={onOpenSignOutConfirm}
        className="mt-3 h-16 w-full justify-start gap-2 rounded-2xl border border-border/80 lg:mt-auto"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </section>
  );
}
