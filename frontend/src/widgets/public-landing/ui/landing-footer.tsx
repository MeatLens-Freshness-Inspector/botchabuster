import { Fingerprint } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-[#d9dee5] bg-white py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-[#5d6570] transition-colors hover:text-[#17191c]">
          <Fingerprint className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-[0.14em]">
            MeatLens
          </span>
        </div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#5d6570]">
          Built for wet market food safety inspection
        </p>
      </div>
    </footer>
  );
}
