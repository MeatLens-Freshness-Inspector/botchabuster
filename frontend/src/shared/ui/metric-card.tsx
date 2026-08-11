import { cn } from "@/shared/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  className?: string;
}

export function MetricCard({ label, value, unit, className }: MetricCardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-3", className)}>
      <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-foreground">
        {value}
        {unit && <span className="ml-0.5 text-xs text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}
