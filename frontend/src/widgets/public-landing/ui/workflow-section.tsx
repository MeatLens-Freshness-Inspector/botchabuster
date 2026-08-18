import { landingWorkflow } from "../lib/landing-data";

export function WorkflowSection() {
  return (
    <section id="workflow" className="mb-24 border-b border-border/70 pb-24">
      <div className="mb-10 flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 font-display text-[10px] uppercase tracking-[0.18em] text-primary">
            01 / Process
          </p>
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
          Inspection Workflow
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-right">
          Four simple steps to secure health standard compliance.
        </p>
      </div>

      <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-8 hidden border-t border-dashed border-border/70 lg:block" />
        {landingWorkflow.map((step, index) => (
          <div
            key={step.title}
            className="group relative border border-border/70 bg-card p-5 transition-colors duration-300 hover:border-primary/60 hover:bg-muted"
          >
            <div className="relative z-10 mb-8 flex h-8 w-8 items-center justify-center border border-primary/50 bg-card font-display text-xs font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              {index + 1}
            </div>
            <div className="mb-5 flex items-center justify-between border-b border-border/70 pb-4">
              <div className="inline-flex h-10 w-10 items-center justify-center border border-border/70 bg-background text-primary">
                <step.icon className="h-5 w-5" />
              </div>
              <span className="font-display text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Step {index + 1}
              </span>
            </div>
            <h3 className="mb-2 font-display text-lg font-bold uppercase tracking-wider">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
