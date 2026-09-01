import { Link } from "react-router-dom";
import { Button } from "@/shared/ui";
import { ChevronRight } from "lucide-react";

type BottomCtaSectionProps = {
  isSignedIn: boolean;
};

export function BottomCtaSection({ isSignedIn }: BottomCtaSectionProps) {
  return (
    <section className="relative overflow-hidden border-y border-[#176b43] bg-[#218c5a] px-6 py-16 sm:px-10 sm:py-20">
      <div className="relative z-10 mx-auto max-w-3xl text-left">
        <h2 className="mb-6 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
          Ready to Inspect?
        </h2>
        <p className="mb-10 max-w-2xl text-lg leading-relaxed text-white/80">
          Get your organization access code and start running objective inspections with
          measurable confidence.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to={isSignedIn ? "/inspect" : "/signup"} className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full gap-2 rounded-lg bg-white px-9 text-xs font-bold uppercase tracking-[0.14em] text-[#15231b] transition-colors hover:bg-[#f4faf6] sm:w-auto"
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
                className="w-full rounded-lg border-white/70 bg-transparent px-8 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/10 sm:w-auto"
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
