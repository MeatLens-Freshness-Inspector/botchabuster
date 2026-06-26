import { Star } from "lucide-react";
import { landingTestimonials } from "../utils/landingData";

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="mb-24">
      <div className="mb-12 text-center">
        <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
          Inspector Feedback
        </h2>
        <p className="mt-3 text-muted-foreground">
          Trusted by professionals in wet markets nationwide.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {landingTestimonials.map((testimonial) => (
          <div
            key={testimonial.name}
            className="relative flex flex-col justify-between rounded-3xl border border-border/30 bg-card/50 p-8 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-accent/30"
          >
            <div>
              <div className="mb-6 flex gap-1">
                {Array.from({ length: testimonial.rating }).map((_, index) => (
                  <Star
                    key={index}
                    className="h-4 w-4 fill-accent text-accent drop-shadow-[0_0_8px_rgba(var(--accent),0.8)]"
                  />
                ))}
              </div>
              <p className="text-base italic leading-relaxed text-foreground/90">
                "{testimonial.quote}"
              </p>
            </div>
            <div className="mt-8 border-t border-border/25 pt-6">
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
