import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MockHotspotProps {
  children: ReactNode;
  active: boolean;
  onAdvance: () => void;
  label?: string;
  className?: string;
}

export function MockHotspot({ children, active, onAdvance, label, className }: MockHotspotProps) {
  if (!active) {
    return <div className={cn("pointer-events-none opacity-40", className)}>{children}</div>;
  }

  return (
    <div className={cn("relative", className)}>
      {/* Pulsing outer ring */}
      <div className="pointer-events-none absolute -inset-1 rounded-xl animate-ping bg-primary/15" />
      <div className="pointer-events-none absolute -inset-0.5 rounded-xl ring-2 ring-primary/60 shadow-[0_0_0_6px_hsl(var(--primary)/0.12)]" />

      {/* Tap label */}
      {label && (
        <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary-foreground shadow-lg z-10">
          {label}
        </div>
      )}

      <button
        type="button"
        className="w-full text-left focus:outline-none"
        onClick={onAdvance}
      >
        {children}
      </button>
    </div>
  );
}
