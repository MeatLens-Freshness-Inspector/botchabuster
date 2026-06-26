import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, Sparkles } from "lucide-react";
import type { AnimatedStatData } from "../../types";
import { AnimatedStat } from "./AnimatedStat";
import { Simulator } from "./Simulator";

type HeroSectionProps = {
  isSignedIn: boolean;
  statCards: AnimatedStatData[];
};

export function HeroSection({ isSignedIn, statCards }: HeroSectionProps) {
  return (
    <section
      id="hero"
      className="relative mb-20 mt-10 grid items-center gap-12 lg:grid-cols-2 lg:gap-8"
    >
      <div className="z-10 text-center lg:text-left">
        <div className="mb-6 inline-flex animate-fade-in items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 backdrop-blur-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-display text-xs font-semibold uppercase tracking-widest text-primary">
            AI-assisted Field Inspection
          </span>
        </div>

        <h1 className="mb-6 font-display text-4xl font-extrabold uppercase leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
          Objective Meat Freshness Checks,{" "}
          <span className="bg-gradient-to-r from-primary via-emerald-400 to-accent bg-clip-text text-transparent">
            Designed for Real Market Flow
          </span>
        </h1>

        <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
          MeatLens helps inspectors perform faster and more consistent decisions using
          image-based color and texture analytics aligned to health guidance.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
          <Link to={isSignedIn ? "/inspect" : "/signup"} className="w-full sm:w-auto">
            <Button
              id="btn-hero-inspect"
              size="lg"
              className="w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-500 px-8 font-display uppercase tracking-wider shadow-lg shadow-primary/25 transition-all hover:-translate-y-1 hover:shadow-primary/40 sm:w-auto"
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
              className="w-full rounded-xl border-border/40 bg-card/40 px-8 font-display uppercase tracking-wider backdrop-blur-sm transition-all hover:bg-card/70 sm:w-auto"
            >
              {isSignedIn ? "View History" : "Sign In"}
            </Button>
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 border-t border-border/20 pt-8">
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
