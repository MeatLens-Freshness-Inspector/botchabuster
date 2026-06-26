import { landingWorkflow } from "../utils/landingData";

export function WorkflowSection() {
  return (
    <section id="workflow" className="mb-24">
      <div className="mb-12 text-center">
        <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
          Inspection Workflow
        </h2>
        <p className="mt-3 text-muted-foreground">
          Four simple steps to secure health standard compliance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {landingWorkflow.map((step, index) => (
          <div
            key={step.title}
            className="group relative rounded-3xl border border-border/30 bg-card/40 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:bg-card/60 hover:shadow-2xl hover:shadow-primary/10"
          >
            <div className="absolute -right-4 -top-4 flex h-12 w-12 items-center justify-center rounded-full bg-background font-display text-xl font-bold text-border/50 transition-colors group-hover:text-primary/30">
              {index + 1}
            </div>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <step.icon className="h-6 w-6" />
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
