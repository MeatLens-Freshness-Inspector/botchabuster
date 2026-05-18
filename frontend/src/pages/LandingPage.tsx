import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { statsClient } from "@/integrations/api";
import {
  ShieldCheck,
  Camera,
  BarChart3,
  Zap,
  ChevronRight,
  Star,
  Users,
  ClipboardCheck,
  TrendingUp,
  Sparkles,
  ScanLine,
  CheckCircle2,
  Menu,
} from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "Computer Vision Capture",
    desc: "Capture meat samples on-site and run confidence-based freshness classification in real time.",
    tint: "bg-[hsl(var(--warning)/0.16)]",
  },
  {
    icon: ShieldCheck,
    title: "NMIS Standard Alignment",
    desc: "Classify every sample against health-guided freshness indicators with a consistent decision framework.",
    tint: "bg-[hsl(var(--primary)/0.16)]",
  },
  {
    icon: BarChart3,
    title: "Actionable Record History",
    desc: "Track inspections over time with confidence trends and searchable evidence.",
    tint: "bg-background/60",
  },
  {
    icon: Zap,
    title: "Built for Field Speed",
    desc: "Optimized mobile-first workflow for wet market environments where quick decisions matter.",
    tint: "bg-background/60",
  },
];

const workflow = [
  {
    icon: Camera,
    title: "Capture",
    desc: "Take or upload sample photo",
  },
  {
    icon: ScanLine,
    title: "Analyze",
    desc: "Run model and rules checks",
  },
  {
    icon: CheckCircle2,
    title: "Classify",
    desc: "Get freshness category + confidence",
  },
  {
    icon: ClipboardCheck,
    title: "Record",
    desc: "Save official inspection log",
  },
];

const testimonials = [
  {
    name: "Maria Santos",
    role: "Barangay Health Inspector",
    quote:
      "MeatLens helped us standardize inspections. It is easier to explain findings when you have objective values.",
    rating: 5,
  },
  {
    name: "Carlos Reyes",
    role: "Municipal Food Safety Officer",
    quote:
      "The app catches subtle quality issues that pure visual checks can miss, especially in crowded market shifts.",
    rating: 5,
  },
  {
    name: "Ana Dela Cruz",
    role: "Wet Market Inspector",
    quote:
      "Simple mobile flow, fast analysis, and clean records. It made our daily inspection routine much smoother.",
    rating: 4,
  },
];

const classifications = [
  { label: "Fresh", className: "bg-fresh/20 text-fresh border-fresh/40" },
  { label: "Acceptable", className: "bg-acceptable/20 text-acceptable border-acceptable/40" },
  { label: "Warning", className: "bg-warning/20 text-warning border-warning/40" },
  { label: "Spoiled", className: "bg-spoiled/20 text-spoiled border-spoiled/40" },
];

const LandingPage = () => {
  const { user } = useAuth();
  const [inspectionCount, setInspectionCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [freshRate, setFreshRate] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function fetchStats() {
      try {
        const stats = await statsClient.getLandingPageStats();
        if (!mounted) return;
        setInspectionCount(stats.inspectionCount);
        setUserCount(stats.userCount);
        setFreshRate(stats.freshRate);
      } catch (err) {
        console.error("Failed to fetch landing stats:", err);
      }
    }
    void fetchStats();
    return () => {
      mounted = false;
    };
  }, []);

  const statCards = useMemo(
    () => [
      {
        icon: Users,
        value: userCount.toLocaleString(),
        label: "Registered Inspectors",
        className: "bg-[hsl(var(--warning)/0.16)]",
      },
      {
        icon: ClipboardCheck,
        value: inspectionCount.toLocaleString(),
        label: "Completed Inspections",
        className: "bg-[hsl(var(--primary)/0.16)]",
      },
      {
        icon: TrendingUp,
        value: `${freshRate}%`,
        label: "Average Fresh Detection",
        className: "bg-background/65",
      },
    ],
    [inspectionCount, userCount, freshRate]
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center justify-between gap-3 px-4 py-3 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-[hsl(var(--primary)/0.16)]">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold uppercase tracking-wider">MeatLens</p>
              <p className="text-[10px] text-muted-foreground">Inspection Intelligence</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <Link to="/inspect">
                <Button size="sm" className="rounded-xl font-display gap-1 uppercase tracking-wider">
                  Open App <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="rounded-xl font-display uppercase tracking-wider">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="rounded-xl font-display uppercase tracking-wider">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl border border-border/70" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-[320px] border-border/70 bg-card/95 p-5">
                <SheetHeader className="mb-5 border-b border-border/60 pb-4 text-left">
                  <SheetTitle className="font-display text-base uppercase tracking-wide">Menu</SheetTitle>
                </SheetHeader>
                <div className="grid gap-2">
                  {user ? (
                    <SheetClose asChild>
                      <Link to="/inspect">
                        <Button className="w-full rounded-xl font-display uppercase tracking-wider gap-2">
                          Open App <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </SheetClose>
                  ) : (
                    <>
                      <SheetClose asChild>
                        <Link to="/signup">
                          <Button className="w-full rounded-xl font-display uppercase tracking-wider">
                            Get Started
                          </Button>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link to="/login">
                          <Button variant="outline" className="w-full rounded-xl font-display uppercase tracking-wider">
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

      <main className="mx-auto w-full max-w-6xl min-w-0 px-3 py-5 sm:px-4 sm:py-8">
        <section className="rounded-3xl border border-border/70 bg-card/92 p-4 shadow-[0_26px_70px_-36px_rgba(0,0,0,0.72)] sm:p-6">
          <div className="grid min-w-0 gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="min-w-0 text-center lg:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-[hsl(var(--primary)/0.16)] px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="font-display text-[11px] uppercase tracking-widest text-primary">AI-assisted Field Inspection</span>
              </div>

              <h1 className="font-display text-[clamp(1.85rem,8.2vw,3rem)] font-bold uppercase leading-[1.08] tracking-tight">
                Objective Meat Freshness Checks,
                <span className="text-primary"> Designed for Real Market Flow</span>
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:mx-0">
                MeatLens helps inspectors perform faster and more consistent decisions using image-based color and texture analytics aligned to health guidance.
              </p>

              <div className="mt-6 grid gap-2 sm:flex sm:flex-wrap">
                <Link to={user ? "/inspect" : "/signup"} className="w-full sm:w-auto">
                  <Button size="lg" className="w-full rounded-xl px-7 font-display text-xs uppercase tracking-wider sm:w-auto gap-2">
                    {user ? "Start Inspecting" : "Create Inspector Account"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to={user ? "/history" : "/login"} className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full rounded-xl px-6 font-display text-xs uppercase tracking-wider sm:w-auto">
                    {user ? "View History" : "Sign In"}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {statCards.map((stat) => (
                <div key={stat.label} className={`rounded-2xl border border-border/70 p-4 ${stat.className}`}>
                  <stat.icon className="mb-2 h-5 w-5 text-primary" />
                  <p className="font-display text-2xl font-semibold sm:text-3xl">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4 sm:col-span-2">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Live Classification Scale</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {classifications.map((c) => (
                    <span key={c.label} className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-display uppercase tracking-wider ${c.className}`}>
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-border/70 bg-card/88 p-4 sm:p-5">
          <h2 className="mb-3 font-display text-xs uppercase tracking-wider text-muted-foreground sm:text-sm">Inspection Workflow</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((step) => (
              <div key={step.title} className="rounded-2xl border border-border/70 bg-background/55 p-3.5 sm:p-3">
                <step.icon className="mb-2 h-4 w-4 text-primary" />
                <p className="font-display text-sm font-semibold uppercase tracking-wider">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-border/70 bg-card/92 p-4 sm:p-5">
          <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-muted-foreground">Capability Blocks</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className={`rounded-2xl border border-border/70 p-4 ${feature.tint}`}>
                <feature.icon className="mb-2 h-5 w-5 text-primary" />
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-border/70 bg-card/92 p-4 sm:p-5">
          <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-muted-foreground">Inspector Feedback</h2>
          <div className="grid gap-3 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-border/70 bg-background/55 p-4">
                <div className="mb-2 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, idx) => (
                    <Star key={idx} className="h-3.5 w-3.5 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-foreground">"{t.quote}"</p>
                <div className="mt-3">
                  <p className="font-display text-xs font-semibold uppercase tracking-wider">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-border/70 bg-card/95 p-5 text-center sm:p-8">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">Ready to Inspect?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Get your organization access code and start running objective inspections with measurable confidence.
          </p>
          <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
            <Link to={user ? "/inspect" : "/signup"} className="w-full sm:w-auto">
              <Button size="lg" className="w-full rounded-xl px-10 font-display uppercase tracking-wider sm:w-auto gap-2">
                {user ? "Go to Inspect" : "Get Started Now"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            {!user && (
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full rounded-xl px-8 font-display uppercase tracking-wider sm:w-auto">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </section>

        <footer className="py-8 text-center">
          <p className="text-xs text-muted-foreground">MeatLens - built for wet market food safety inspection</p>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
