import { Fingerprint } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/20 bg-background py-10 text-center">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <div className="flex items-center gap-2 text-muted-foreground opacity-60 transition-opacity hover:opacity-100">
          <Fingerprint className="h-4 w-4" />
          <span className="font-display text-xs font-bold uppercase tracking-widest">
            MeatLens
          </span>
        </div>
        <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground/60">
          Built for wet market food safety inspection
        </p>
      </div>
    </footer>
  );
}
