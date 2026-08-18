import { Link } from "react-router-dom";
import { Button } from "@/shared/ui";
import { ChevronRight, Sparkles } from "lucide-react";
import type { LandingStatCard } from "@/features/public-landing";
import { AnimatedStat } from "./animated-stat";
import { Simulator } from "./simulator";

type HeroSectionProps = {
  isSignedIn: boolean;
  statCards: LandingStatCard[];
};

export function HeroSection({ isSignedIn, statCards }: HeroSectionProps) {
  return (
    <section
      id="hero"
      className="relative grid items-center gap-10 border-b border-border/70 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-12 lg:py-16"
    >
      <div className="z-10 text-left">
        <div className="mb-5 inline-flex items-center gap-2 border border-primary/40 bg-primary/10 px-3 py-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            AI-assisted Field Inspection
          </span>
        </div>

        <h1 className="mb-6 max-w-3xl font-display text-4xl font-extrabold uppercase leading-[1.04] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
          Objective Meat Freshness Checks,{" "}
          <span className="text-primary">
            Designed for Real Market Flow
          </span>
        </h1>

        <p className="mb-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          MeatLens helps inspectors perform faster and more consistent decisions using
          image-based color and texture analytics aligned to health guidance.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to={isSignedIn ? "/inspect" : "/signup"} className="w-full sm:w-auto">
            <Button
              id="btn-hero-inspect"
              size="lg"
              className="w-full gap-2 rounded-md bg-primary px-8 font-display uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              {isSignedIn ? "Start Inspecting" : "Create Inspector Account"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to={isSignedIn ? "/history" : "/login"} className="w-full sm:w-auto">
            <Button
              id="btn-hero-history"
              variant="outline"
              size="lg"
              className="w-full rounded-md border-border/70 bg-card px-8 font-display uppercase tracking-wider transition-colors hover:bg-muted sm:w-auto"
            >
              {isSignedIn ? "View History" : "Sign In"}
            </Button>
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-3 border-t border-border/70 pt-5">
          {statCards.map((stat) => (
            <AnimatedStat
              key={stat.label}
              rawValue={stat.rawValue}
              suffix={stat.suffix}
              label={stat.label}
            />
          ))}
        </div>
      </div>

      <div className="z-10 flex justify-center lg:justify-end">
        <Simulator />
      </div>
    </section>
  );
}
