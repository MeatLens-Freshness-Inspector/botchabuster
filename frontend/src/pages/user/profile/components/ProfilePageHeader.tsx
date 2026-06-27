import { ArrowLeft } from "lucide-react";

type ProfilePageHeaderProps = {
  onBack: () => void;
};

export function ProfilePageHeader({ onBack }: ProfilePageHeaderProps) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-card/85 px-3 py-3 backdrop-blur-sm">
      <button
        type="button"
        onClick={onBack}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground transition-colors hover:bg-background"
        aria-label="Go back"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">My Profile</h1>
        <p className="text-xs text-muted-foreground">Inspector account center</p>
      </div>
    </div>
  );
}
