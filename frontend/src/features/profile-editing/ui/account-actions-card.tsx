import { LogOut } from "lucide-react";
import { Button } from "@/shared/ui";

type AccountActionsCardProps = {
  onOpenSignOutConfirm: () => void;
};

export function AccountActionsCard({ onOpenSignOutConfirm }: AccountActionsCardProps) {
  return (
    <section
      data-testid="profile-actions-card"
      className="order-2 flex h-full flex-col rounded-3xl border border-border/70 bg-card/92 p-4"
    >
      <div>
        <h3 className="font-display text-base font-semibold">Account Actions</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Manage the current session on this device.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={onOpenSignOutConfirm}
        className="mt-auto h-11 w-full justify-start gap-2 rounded-xl border border-border/80"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </section>
  );
}
