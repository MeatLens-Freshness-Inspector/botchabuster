import React from "react";
import { cn } from "@/lib/utils";
import type { FreshnessClassification } from "@/types/inspection";

const classificationConfig: Record<FreshnessClassification, { label: string; className: string; icon: string }> = {
  fresh: { label: "FRESH", className: "bg-fresh/20 text-fresh border-fresh/40", icon: "OK" },
  "not fresh": { label: "NOT FRESH", className: "bg-warning/20 text-warning border-warning/40", icon: "!" },
  acceptable: { label: "ACCEPTABLE", className: "bg-acceptable/20 text-acceptable border-acceptable/40", icon: "~" },
  warning: { label: "WARNING", className: "bg-warning/20 text-warning border-warning/40", icon: "!" },
  spoiled: { label: "SPOILED", className: "bg-spoiled/20 text-spoiled border-spoiled/40", icon: "X" },
};

interface FreshnessBadgeProps {
  classification: FreshnessClassification;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function FreshnessBadge({ classification, className, size = "md" }: FreshnessBadgeProps) {
  const config = classificationConfig[classification];
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-display font-semibold uppercase tracking-wider",
        config.className,
        sizeClasses[size],
        className
      )}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
