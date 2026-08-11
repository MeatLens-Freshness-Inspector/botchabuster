import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";

type HistoryHeaderProps = {
  totalInspections: number;
  avgConfidence: number;
  freshRate: number;
  spoiledRate: number;
};

export function HistoryHeader({
  totalInspections,
  avgConfidence,
  freshRate,
  spoiledRate,
}: HistoryHeaderProps) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-[0_24px_70px_-34px_rgba(0,0,0,0.65)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)]">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">History</h1>
            <p className="text-xs text-muted-foreground">
              Inspection records and timeline insights
            </p>
          </div>
        </div>

        <div className="rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
          <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
          {format(new Date(), "MMMM yyyy")}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)] p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Total Records
          </p>
          <p className="mt-1 font-display text-3xl font-semibold">{totalInspections}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Avg Confidence
          </p>
          <p className="mt-1 font-display text-3xl font-semibold">{avgConfidence}%</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Fresh Rate
          </p>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-display text-3xl font-semibold">{freshRate}%</p>
            <CheckCircle2 className="h-4 w-4 text-fresh" />
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Spoiled Rate
          </p>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-display text-3xl font-semibold">{spoiledRate}%</p>
            {spoiledRate > 20 ? (
              <AlertTriangle className="h-4 w-4 text-spoiled" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-fresh" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
