import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { ExportProgress } from "@/shared/lib/use-export-task";

export interface ExportLoadingOverlayProps {
  visible: boolean;
  message: string;
  progress?: ExportProgress | null;
  className?: string;
}

export function ExportLoadingOverlay({
  visible,
  message,
  progress = null,
  className,
}: ExportLoadingOverlayProps) {
  if (!visible) return null;

  const total = progress ? Math.max(1, Math.trunc(progress.total)) : 1;
  const current = progress
    ? Math.min(Math.max(0, Math.trunc(progress.current)), total)
    : 0;
  const percentage = Math.round((current / total) * 100);

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
      <div className="w-full max-w-sm space-y-3 rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm font-medium shadow-sm">
        <div className="flex items-center gap-3">
          {!progress ? <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" /> : null}
          <span>{message}</span>
          {progress ? <span className="ml-auto tabular-nums text-muted-foreground">{percentage}%</span> : null}
        </div>
        {progress ? (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={current}
            aria-label={`${current} of ${total}`}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
