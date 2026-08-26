import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface ExportLoadingOverlayProps {
  visible: boolean;
  message: string;
  className?: string;
}

export function ExportLoadingOverlay({
  visible,
  message,
  className,
}: ExportLoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-background/80 p-6 backdrop-blur-sm",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm font-medium shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <span>{message}</span>
      </div>
    </div>
  );
}
