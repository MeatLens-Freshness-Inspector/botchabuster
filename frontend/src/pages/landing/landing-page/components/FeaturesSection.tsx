import { landingFeatures } from "../utils/landingData";

const mockConfidenceScores = [92, 88, 79, 95];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="mb-24 rounded-[3rem] border border-border/30 bg-gradient-to-b from-card/30 to-background p-8 sm:p-12"
    >
      <div className="mb-12 text-center lg:text-left">
        <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
          Capability Blocks
        </h2>
        <p className="mt-3 text-muted-foreground">
          Powered by advanced mobile vision and secure records.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {landingFeatures.map((feature, index) => {
          const mockConfidence = mockConfidenceScores[index];

          return (
            <div
              key={feature.title}
              className="group flex flex-col gap-4 rounded-3xl border border-border/30 bg-card/30 p-6 backdrop-blur-sm transition-all hover:bg-card/50"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/30 bg-background transition-transform group-hover:scale-110">
                  <feature.icon className="h-5 w-5 text-primary" />
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

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-display text-[9px] uppercase tracking-widest text-muted-foreground">
                    Accuracy Index
                  </span>
                  <span className="font-display text-[9px] font-bold text-primary">
                    {mockConfidence}%
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-border/40">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-700 group-hover:opacity-100"
                    style={{ width: `${mockConfidence}%`, opacity: 0.6 }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
