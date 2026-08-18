import { Link } from "react-router-dom";
import { Button } from "@/shared/ui";
import { ChevronRight } from "lucide-react";

type BottomCtaSectionProps = {
  isSignedIn: boolean;
};

export function BottomCtaSection({ isSignedIn }: BottomCtaSectionProps) {
  return (
    <section className="relative overflow-hidden border border-primary/40 bg-primary px-6 py-16 text-center text-primary-foreground sm:px-10 sm:py-20">
      <div className="absolute inset-x-0 top-0 h-2 bg-accent" />
      <div className="relative z-10 mx-auto max-w-2xl">
        <h2 className="mb-6 font-display text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">
          Ready to Inspect?
        </h2>
        <p className="mb-10 text-lg text-primary-foreground/80">
          Get your organization access code and start running objective inspections with
          measurable confidence.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link to={isSignedIn ? "/inspect" : "/signup"} className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full gap-2 rounded-md bg-primary-foreground px-10 font-display uppercase tracking-wider text-primary transition-colors hover:bg-primary-foreground/90 sm:w-auto"
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
                className="w-full rounded-md border-primary-foreground/50 bg-transparent px-8 font-display uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary-foreground/10 sm:w-auto"
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
