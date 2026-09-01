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
      className="relative mb-24 mt-12 grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-16"
    >
      <div className="z-10 text-left">
        <div className="mb-7 inline-flex animate-fade-in items-center gap-2 border-l-2 border-[#218c5a] pl-3">
          <Sparkles className="h-4 w-4 text-[#218c5a]" />
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#218c5a]">
            AI-assisted Field Inspection
          </span>
        </div>

        <h1 className="mb-7 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#15231b] sm:text-5xl lg:text-[4.5rem]">
          Objective Meat Freshness Checks,{" "}
          <span className="text-[#218c5a]">
            Designed for Real Market Flow
          </span>
        </h1>

        <p className="mb-9 max-w-xl text-base leading-relaxed text-[#5d6d63] sm:text-lg">
          MeatLens helps inspectors perform faster and more consistent decisions using
          image-based color and texture analytics aligned to health guidance.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to={isSignedIn ? "/inspect" : "/signup"} className="w-full sm:w-auto">
            <Button
              id="btn-hero-inspect"
              size="lg"
              className="w-full gap-2 rounded-lg bg-[#218c5a] px-7 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#176b43] sm:w-auto"
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
              className="w-full rounded-lg border-[#d8e5dc] bg-white px-7 text-xs font-bold uppercase tracking-[0.14em] text-[#15231b] transition-colors hover:bg-[#f4faf6] sm:w-auto"
            >
              {isSignedIn ? "View History" : "Sign In"}
            </Button>
          </Link>
        </div>

        <div className="mt-14 grid grid-cols-3 gap-4 border-t border-[#d8e5dc] pt-6">
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
