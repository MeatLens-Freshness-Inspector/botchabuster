import { Info, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  inspectScopeReminder,
  scopeReferencePath,
} from "@/lib/help/scopeDelimitationsContent";

export function InspectScopeReminder() {
  return (
    <section className="mt-4 rounded-3xl border border-border/70 bg-card/92 p-4 shadow-[0_18px_55px_-34px_rgba(0,0,0,0.55)]">
      <div className="border-l-2 border-primary/80 pl-3.5 py-0.5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-[hsl(var(--primary)/0.16)] text-primary">
            <Info className="h-3.5 w-3.5" />
          </div>
          <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
            {inspectScopeReminder.title}
          </h2>
        </div>

        {/* Bullet List */}
        <ul className="mt-2.5 space-y-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
          {inspectScopeReminder.bullets.map((bullet) => (
            <li key={bullet} className="flex items-center gap-2">
              <span className="text-muted-foreground select-none">•</span>
              <span className="text-foreground">{bullet}</span>
            </li>
          ))}
        </ul>

        {/* CTA Link Pill */}
        <div className="mt-3.5">
          <Link
            to={scopeReferencePath}
            className="group inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-background/60 px-3 text-xs font-medium text-foreground transition-all hover:bg-background hover:text-primary hover:border-border"
          >
            <span>{inspectScopeReminder.ctaLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
