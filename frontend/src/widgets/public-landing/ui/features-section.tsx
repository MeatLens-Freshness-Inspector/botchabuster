import { landingFeatures } from "../lib/landing-data";

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="mb-24 border-y border-[#d8e5dc] bg-[#f4faf6] px-6 py-10 sm:px-10 sm:py-12"
    >
      <div className="mb-10 border-b border-[#d8e5dc] pb-5 text-left">
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#15231b]">
          Capability Blocks
        </h2>
        <p className="mt-3 text-[#5d6d63]">
          Powered by advanced mobile vision and secure records.
        </p>
      </div>

      <div className="grid gap-x-8 sm:grid-cols-2 sm:divide-x sm:divide-[#d8e5dc]">
        {landingFeatures.map((feature) => (
          <div
            key={feature.title}
            className="group border-t border-[#d8e5dc] py-7 first:border-t-0 sm:px-8 sm:first:border-t-0 lg:py-8"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#d8e5dc] bg-white text-[#218c5a] transition-colors group-hover:border-[#218c5a]">
                <feature.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="mb-2 text-base font-semibold tracking-[-0.02em] text-[#15231b]">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#5d6d63]">{feature.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
