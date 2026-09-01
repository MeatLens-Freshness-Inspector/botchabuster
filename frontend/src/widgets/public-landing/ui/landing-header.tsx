import { Link } from "react-router-dom";
import { Button } from "@/shared/ui";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import { ChevronRight, Fingerprint, Menu } from "lucide-react";

type LandingHeaderProps = {
  isSignedIn: boolean;
};

export function LandingHeader({ isSignedIn }: LandingHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#d8e5dc] bg-white/95">
      <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#218c5a]">
            <Fingerprint className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#15231b]">MeatLens</p>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#5d6d63]">
              Inspection Intelligence
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-4 sm:flex">
          {isSignedIn ? (
            <Link to="/inspect">
              <Button
                size="sm"
                className="gap-2 rounded-lg bg-[#218c5a] px-4 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#176b43]"
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
                  className="rounded-lg px-4 text-xs font-bold uppercase tracking-[0.14em] text-[#15231b] hover:bg-[#f4faf6]"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="sm"
                  className="rounded-lg bg-[#218c5a] px-4 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#176b43]"
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
                className="rounded-lg border border-[#d8e5dc] bg-white text-[#15231b] hover:bg-[#f4faf6]"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85vw] max-w-xs border-[#d8e5dc] bg-white"
            >
              <SheetHeader className="mb-6 border-b border-[#d8e5dc] pb-4 text-left">
                <SheetTitle className="text-sm uppercase tracking-[0.16em] text-[#15231b]">Menu</SheetTitle>
              </SheetHeader>
              <div className="grid gap-3">
                {isSignedIn ? (
                  <SheetClose asChild>
                    <Link to="/inspect">
                      <Button className="w-full gap-2 rounded-lg bg-[#218c5a] text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-[#176b43]">
                        Open App <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </SheetClose>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link to="/signup">
                        <Button className="w-full rounded-lg bg-[#218c5a] text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-[#176b43]">
                          Get Started
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to="/login">
                        <Button
                          variant="outline"
                          className="w-full rounded-lg border-[#d8e5dc] text-xs font-bold uppercase tracking-[0.14em] text-[#15231b] hover:bg-[#f4faf6]"
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
