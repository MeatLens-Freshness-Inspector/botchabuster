import { landingFeatures } from "../lib/landing-data";

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="mb-24 border-b border-border/70 pb-24"
    >
      <div className="mb-10 flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 font-display text-[10px] uppercase tracking-[0.18em] text-primary">
            02 / Capability
          </p>
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
            Capability Blocks
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-right">
          Powered by advanced mobile vision and secure records.
        </p>
      </div>

      <div className="grid gap-px border border-border/70 bg-border/70 sm:grid-cols-2">
        {landingFeatures.map((feature) => (
            <div
              key={feature.title}
              className="group flex min-h-52 flex-col gap-6 bg-card p-6 transition-colors hover:bg-muted"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-border/70 bg-background text-primary transition-colors group-hover:border-primary/60 group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="mb-2 font-display text-base font-bold uppercase tracking-wider">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.desc}
                  </p>
                </div>
              </div>

            </div>
        ))}
      </div>
    </section>
  );
}
