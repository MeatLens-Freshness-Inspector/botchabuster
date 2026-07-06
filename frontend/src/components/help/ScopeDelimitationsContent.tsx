import { cn } from "@/lib/utils";
import {
  scopeReferencePage,
  type ScopeReferenceSection,
} from "@/lib/help/scopeDelimitationsContent";

interface ScopeDelimitationsContentProps {
  className?: string;
}

function ScopeSection({ title, body, bullets }: ScopeReferenceSection) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {bullets && (
        <ul className="list-disc space-y-1 pl-5">
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ScopeDelimitationsContent({
  className,
}: ScopeDelimitationsContentProps) {
  return (
    <article
      className={cn(
        "space-y-6 text-sm leading-relaxed text-secondary-foreground",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        {scopeReferencePage.description}
      </p>

      {scopeReferencePage.sections.map((section) => (
        <ScopeSection key={section.id} {...section} />
      ))}
    </article>
  );
}
