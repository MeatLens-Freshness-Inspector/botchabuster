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
    <header className="sticky top-0 z-50 border-b border-[#d9dee5] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#17191c]">
            <Fingerprint className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#17191c]">MeatLens</p>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#5d6570]">
              Inspection Intelligence
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-4 sm:flex">
          {isSignedIn ? (
            <Link to="/inspect">
              <Button
                size="sm"
                className="gap-2 rounded-lg bg-[#ff4f00] px-4 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#d93f00]"
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
                  className="rounded-lg px-4 text-xs font-bold uppercase tracking-[0.14em] text-[#17191c] hover:bg-[#f7f7f8]"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="sm"
                  className="rounded-lg bg-[#ff4f00] px-4 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#d93f00]"
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
                className="rounded-lg border border-[#d9dee5] bg-white text-[#17191c] hover:bg-[#f7f7f8]"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85vw] max-w-xs border-[#d9dee5] bg-white"
            >
              <SheetHeader className="mb-6 border-b border-[#d9dee5] pb-4 text-left">
                <SheetTitle className="text-sm uppercase tracking-[0.16em] text-[#17191c]">Menu</SheetTitle>
              </SheetHeader>
              <div className="grid gap-3">
                {isSignedIn ? (
                  <SheetClose asChild>
                    <Link to="/inspect">
                      <Button className="w-full gap-2 rounded-lg bg-[#ff4f00] text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-[#d93f00]">
                        Open App <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </SheetClose>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link to="/signup">
                        <Button className="w-full rounded-lg bg-[#ff4f00] text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-[#d93f00]">
                          Get Started
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to="/login">
                        <Button
                          variant="outline"
                          className="w-full rounded-lg border-[#d9dee5] text-xs font-bold uppercase tracking-[0.14em] text-[#17191c] hover:bg-[#f7f7f8]"
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
