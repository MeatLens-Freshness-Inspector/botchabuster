import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

type BottomCtaSectionProps = {
  isSignedIn: boolean;
};

export function BottomCtaSection({ isSignedIn }: BottomCtaSectionProps) {
  return (
    <section className="relative overflow-hidden rounded-[3rem] border border-primary/20 bg-primary/5 px-6 py-20 text-center shadow-[0_0_100px_rgba(var(--primary),0.1)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.15)_0%,transparent_60%)]" />
      <div className="relative z-10 mx-auto max-w-2xl">
        <h2 className="mb-6 font-display text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">
          Ready to Inspect?
        </h2>
        <p className="mb-10 text-lg text-muted-foreground">
          Get your organization access code and start running objective inspections with
          measurable confidence.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link to={isSignedIn ? "/inspect" : "/signup"} className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full gap-2 rounded-xl bg-primary px-10 font-display uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-105 hover:bg-primary/90 sm:w-auto"
            >
              {isSignedIn ? "Go to Inspect" : "Get Started Now"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          {!isSignedIn && (
            <Link to="/login" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-xl border-border/40 bg-card/40 px-8 font-display uppercase tracking-wider backdrop-blur-md transition-all hover:bg-card/70 sm:w-auto"
              >
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
