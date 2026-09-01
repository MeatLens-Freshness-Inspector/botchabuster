import { landingWorkflow } from "../lib/landing-data";

export function WorkflowSection() {
  return (
    <section id="workflow" className="mb-24">
      <div className="mb-12 border-b border-[#d9dee5] pb-5 text-left">
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#17191c]">
          Inspection Workflow
        </h2>
        <p className="mt-3 text-[#5d6570]">
          Four simple steps to secure health standard compliance.
        </p>
      </div>

      <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-5 hidden h-px bg-[#d9dee5] lg:block" />
        {landingWorkflow.map((step, index) => (
          <div
            key={step.title}
            className="group relative border-t border-[#d9dee5] px-0 pt-6 transition-colors duration-300 hover:border-[#ff4f00] lg:mr-6 lg:last:mr-0"
          >
            <div className="absolute right-0 top-1 text-4xl font-semibold tracking-[-0.08em] text-[#d9dee5] transition-colors group-hover:text-[#ff4f00]/30" aria-hidden="true">
              {index + 1}
            </div>
            <div className="relative z-10 mb-5 inline-flex h-10 w-10 items-center justify-center border border-[#d9dee5] bg-white text-[#ff4f00] transition-colors group-hover:border-[#ff4f00]">
              <step.icon className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold tracking-[-0.02em] text-[#17191c]">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-[#5d6570]">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
