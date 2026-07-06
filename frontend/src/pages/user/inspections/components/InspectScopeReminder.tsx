import { BookOpenText } from "lucide-react";
import { Link } from "react-router-dom";
import {
  inspectScopeReminder,
  scopeReferencePath,
} from "@/lib/help/scopeDelimitationsContent";

export function InspectScopeReminder() {
  return (
    <section className="mt-4 rounded-3xl border border-border/70 bg-card/92 p-4 shadow-[0_18px_55px_-34px_rgba(0,0,0,0.55)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.14)]">
          <BookOpenText className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {inspectScopeReminder.title}
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {inspectScopeReminder.description}
            </p>
          </div>

          <ul className="grid gap-2 text-xs text-foreground sm:grid-cols-2">
            {inspectScopeReminder.bullets.map((bullet) => (
              <li
                key={bullet}
                className="rounded-2xl border border-border/70 bg-background/55 px-3 py-2"
              >
                {bullet}
              </li>
            ))}
          </ul>

          <Link
            to={scopeReferencePath}
            className="inline-flex h-10 items-center rounded-xl border border-border/80 px-4 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-background"
          >
            {inspectScopeReminder.ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
