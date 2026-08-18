import { Star } from "lucide-react";
import { landingTestimonials } from "../lib/landing-data";

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="mb-24 border-b border-border/70 pb-24">
      <div className="mb-10 flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 font-display text-[10px] uppercase tracking-[0.18em] text-primary">
            03 / Field notes
          </p>
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
            Inspector Feedback
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-right">
          Trusted by professionals in wet markets nationwide.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {landingTestimonials.map((testimonial, index) => (
          <div
            key={testimonial.name}
            className={`relative flex flex-col justify-between border border-border/70 bg-card p-6 transition-colors hover:border-primary/60 hover:bg-muted ${index === 0 ? "lg:col-span-2 lg:p-8" : ""}`}
          >
            <div>
              <div
                className="mb-6 flex gap-1"
                role="img"
                aria-label={`${testimonial.rating} out of 5 stars`}
              >
                {Array.from({ length: testimonial.rating }).map((_, index) => (
                  <Star
                    key={index}
                    aria-hidden="true"
                    className="h-4 w-4 fill-accent text-accent"
                  />
                ))}
              </div>
              <p className="max-w-3xl text-base italic leading-relaxed text-foreground/90 lg:text-lg">
                "{testimonial.quote}"
              </p>
            </div>
            <div className="mt-8 border-t border-border/70 pt-5">
              <p className="font-display text-sm font-bold uppercase tracking-wider text-primary">
                {testimonial.name}
              </p>
              <p className="font-display text-[11px] uppercase tracking-widest text-muted-foreground">
                {testimonial.role}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
