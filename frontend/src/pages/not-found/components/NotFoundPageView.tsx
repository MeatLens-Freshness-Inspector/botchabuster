import { ArrowLeft, ChevronRight, Compass, Home, LogIn, SearchX, ShieldAlert, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { NotFoundQuickLink } from "../types";

type NotFoundPageViewProps = {
  missingPath: string;
  quickLinks: NotFoundQuickLink[];
  onGoBack: () => void;
};

const iconByKind = {
  home: Home,
  inspect: SearchX,
  history: Compass,
  profile: Compass,
  login: LogIn,
  signup: UserPlus,
} satisfies Record<NotFoundQuickLink["kind"], typeof Home>;

const NotFoundPageView = ({
  missingPath,
  quickLinks,
  onGoBack,
}: NotFoundPageViewProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_36%),radial-gradient(circle_at_80%_20%,hsl(var(--accent)/0.12),transparent_28%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] text-foreground">
      <div className="pointer-events-none absolute left-[-8%] top-[-12%] h-[420px] w-[420px] rounded-full bg-primary/12 blur-[140px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[18%] h-[320px] w-[320px] rounded-full bg-accent/10 blur-[140px]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <section className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-[11px] font-display uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-sm">
              <ShieldAlert className="h-3.5 w-3.5 text-primary" />
              Error 404
            </div>

            <p className="mt-6 font-display text-7xl font-semibold leading-none tracking-tight text-foreground sm:text-8xl">
              404
            </p>
            <h1 className="mt-4 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              The page you requested does not exist.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              The address is not part of the current MeatLens routes, or the page has been moved.
              Use one of the recovery actions below to get back to a working screen.
            </p>

            <div className="mt-6 rounded-3xl border border-border/70 bg-card/78 p-4 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.7)] backdrop-blur-sm">
              <div className="flex items-center gap-2 text-[11px] font-display uppercase tracking-[0.18em] text-muted-foreground">
                <Compass className="h-3.5 w-3.5 text-primary" />
                Requested Path
              </div>
              <code className="mt-3 block break-all rounded-2xl border border-border/70 bg-background/70 px-3 py-3 font-mono text-sm text-foreground">
                {missingPath}
              </code>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-xl px-6 font-display text-xs uppercase tracking-[0.16em]">
                <Link to="/">
                  <Home className="h-4 w-4" />
                  Go to Home
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onGoBack}
                className="h-12 rounded-xl border-border/80 px-6 font-display text-xs uppercase tracking-[0.16em]"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
            </div>
          </section>

          <section className="rounded-3xl border border-border/70 bg-card/88 p-6 shadow-[0_24px_80px_-44px_rgba(0,0,0,0.78)] backdrop-blur-sm sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-[hsl(var(--primary)/0.14)]">
                <SearchX className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-display uppercase tracking-[0.18em] text-primary/90">
                  Recovery Actions
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                  Suggested destinations
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  These links point to active routes so you can recover without reloading the app.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {quickLinks.map((link) => {
                const Icon = iconByKind[link.kind];

                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/50 px-4 py-4 transition-colors hover:border-primary/40 hover:bg-background/75"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/75">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display text-base font-semibold tracking-tight">
                          {link.label}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {link.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-border/70 bg-background/55 px-4 py-4">
              <p className="text-[11px] font-display uppercase tracking-[0.18em] text-muted-foreground">
                Status
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Resource not found. The current route did not match any registered page component.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default NotFoundPageView;
