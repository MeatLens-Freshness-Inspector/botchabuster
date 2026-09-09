import type { ReactNode } from "react";
import React from "react";
import { cn } from "@/shared/lib/utils";

interface MockPhoneFrameProps {
  children: ReactNode;
  className?: string;
}

export function MockPhoneFrame({ children, className }: MockPhoneFrameProps) {
  return (
    <div
      data-tutorial-phone-frame
      className={cn(
        "relative mx-auto flex w-[min(300px,calc(100vw-2rem))] max-w-full flex-col rounded-[40px] border-[3px] border-border/80 bg-[hsl(var(--background))] shadow-[0_0_0_1px_hsl(var(--border)/0.3),0_48px_120px_-32px_rgba(0,0,0,0.85),inset_0_1px_0_hsl(var(--border)/0.5)]",
        className
      )}
      style={{ height: "580px" }}
    >
      {/* Side volume buttons */}
      <div className="pointer-events-none absolute -left-[5px] top-[88px] h-8 w-[3px] rounded-l-full bg-border/60" />
      <div className="pointer-events-none absolute -left-[5px] top-[128px] h-12 w-[3px] rounded-l-full bg-border/60" />
      <div className="pointer-events-none absolute -left-[5px] top-[152px] h-12 w-[3px] rounded-l-full bg-border/60" />
      {/* Power button */}
      <div className="pointer-events-none absolute -right-[5px] top-[120px] h-16 w-[3px] rounded-r-full bg-border/60" />

      {/* Notch / Dynamic Island pill */}
      <div className="relative flex flex-shrink-0 items-center justify-center pt-3 pb-1">
        <div className="h-[18px] w-[80px] rounded-full bg-foreground/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]" />
      </div>

      {/* Screen content */}
      <div
        data-tutorial-phone-screen
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-[36px]"
      >
        {children}
      </div>

      {/* Home indicator bar */}
      <div
        data-tutorial-phone-home-indicator
        className="flex flex-shrink-0 items-center justify-center rounded-b-[36px] bg-[hsl(var(--background))] py-2"
      >
        <div className="h-1 w-24 rounded-full bg-foreground/25" />
      </div>
    </div>
  );
}
