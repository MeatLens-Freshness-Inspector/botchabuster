import { landingWorkflow } from "../lib/landing-data";

export function WorkflowSection() {
  return (
    <section id="workflow" className="mb-24">
      <div className="mb-12 border-b border-[#d8e5dc] pb-5 text-left">
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#15231b]">
          Inspection Workflow
        </h2>
        <p className="mt-3 text-[#5d6d63]">
          Four simple steps to secure health standard compliance.
        </p>
      </div>

      <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-5 hidden h-px bg-[#d8e5dc] lg:block" />
        {landingWorkflow.map((step, index) => (
          <div
            key={step.title}
            className="group relative border-t border-[#d8e5dc] px-0 pt-6 transition-colors duration-300 hover:border-[#218c5a] lg:mr-6 lg:last:mr-0"
          >
            <div className="absolute right-0 top-1 text-4xl font-semibold tracking-[-0.08em] text-[#d8e5dc] transition-colors group-hover:text-[#218c5a]/30" aria-hidden="true">
              {index + 1}
            </div>
            <div className="relative z-10 mb-5 inline-flex h-10 w-10 items-center justify-center border border-[#d8e5dc] bg-white text-[#218c5a] transition-colors group-hover:border-[#218c5a]">
              <step.icon className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold tracking-[-0.02em] text-[#15231b]">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-[#5d6d63]">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
