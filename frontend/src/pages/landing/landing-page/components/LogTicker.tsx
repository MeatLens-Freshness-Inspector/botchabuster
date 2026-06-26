import { useMemo, useRef } from "react";
import { tickerItems } from "../utils/landingData";

function getTickerDotClass(result: string): string {
  if (result === "Fresh") return "bg-fresh";
  if (result === "Acceptable") return "bg-acceptable";
  if (result === "Warning") return "bg-warning";
  return "bg-spoiled";
}

export function LogTicker() {
  const trackRef = useRef<HTMLDivElement>(null);
  const doubled = useMemo(() => [...tickerItems, ...tickerItems], []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-card/30 py-4 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background to-transparent" />

      <p className="mb-3 px-6 font-display text-[10px] uppercase tracking-widest text-muted-foreground">
        Live Inspection Feed
      </p>

      <div
        ref={trackRef}
        className="flex gap-3 px-6"
        style={{
          animation: "ticker-scroll 28s linear infinite",
          width: "max-content",
        }}
      >
        {doubled.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="flex shrink-0 items-center gap-3 rounded-xl border border-white/5 bg-background/60 px-4 py-2.5 backdrop-blur-sm"
          >
            <div
              className={`h-2 w-2 shrink-0 rounded-full ${getTickerDotClass(item.result)} animate-pulse`}
            />
            <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
              {item.label}
            </span>
            <span className={`font-display text-[10px] uppercase tracking-widest ${item.textCol}`}>
              {item.result} · {item.conf}%
            </span>
            <span className="font-display text-[9px] uppercase tracking-widest text-muted-foreground/60">
              {item.market}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
