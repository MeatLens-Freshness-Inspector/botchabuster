import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ChevronRight, Fingerprint, Menu } from "lucide-react";

type LandingHeaderProps = {
  isSignedIn: boolean;
};

export function LandingHeader({ isSignedIn }: LandingHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/30 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-inner ring-1 ring-primary/30">
            <Fingerprint className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-widest">MeatLens</p>
            <p className="font-display text-[9px] uppercase tracking-widest text-muted-foreground">
              Inspection Intelligence
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-4 sm:flex">
          {isSignedIn ? (
            <Link to="/inspect">
              <Button
                size="sm"
                className="gap-2 rounded-xl font-display uppercase tracking-wider shadow-lg shadow-primary/20 transition-all hover:scale-105"
              >
                Open App <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl font-display uppercase tracking-wider hover:bg-muted/60"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="sm"
                  className="rounded-xl bg-gradient-to-r from-primary to-emerald-500 font-display uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 hover:shadow-primary/40"
                >
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="sm:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-md"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85vw] max-w-xs border-border/40 bg-background/95 backdrop-blur-xl"
            >
              <SheetHeader className="mb-6 border-b border-border/30 pb-4 text-left">
                <SheetTitle className="font-display uppercase tracking-widest">Menu</SheetTitle>
              </SheetHeader>
              <div className="grid gap-3">
                {isSignedIn ? (
                  <SheetClose asChild>
                    <Link to="/inspect">
                      <Button className="w-full gap-2 rounded-xl font-display uppercase tracking-wider">
                        Open App <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </SheetClose>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link to="/signup">
                        <Button className="w-full rounded-xl bg-gradient-to-r from-primary to-emerald-500 font-display uppercase tracking-wider">
                          Get Started
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to="/login">
                        <Button
                          variant="outline"
                          className="w-full rounded-xl border-border/40 font-display uppercase tracking-wider"
                        >
                          Sign In
                        </Button>
                      </Link>
                    </SheetClose>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
