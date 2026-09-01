import { useMemo, useRef } from "react";
import { tickerItems } from "../lib/landing-data";

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
    <div className="relative overflow-hidden border-y border-[#d9dee5] bg-white py-4">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-white to-transparent" />

      <p className="mb-3 px-6 text-[10px] font-bold uppercase tracking-[0.14em] text-[#5d6570]">
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
            className="flex shrink-0 items-center gap-3 rounded-md border border-[#d9dee5] bg-[#f7f7f8] px-4 py-2.5"
          >
            <div
              className={`h-2 w-2 shrink-0 rounded-full ${getTickerDotClass(item.result)} animate-pulse`}
            />
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#17191c]">
              {item.label}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${item.textCol}`}>
              {item.result} · {item.conf}%
            </span>
            {item.scopeLabel && (
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-warning">
                {item.scopeLabel}
              </span>
            )}
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#5d6570]">
              {item.market}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
