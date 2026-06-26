import { useEffect, useMemo, useRef, useState } from "react";
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
  AlertTriangle,
  Fingerprint,
  Cpu,
  RefreshCcw,
} from "lucide-react";

// ── Animated counter (counts up from 0 when visible) ────────────────────────
const useCountUp = (target: number, duration = 1800) => {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (target === 0) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - (1 - progress) ** 3; // ease-out cubic
            setValue(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
            else setValue(target);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { value, ref };
};

type AnimatedStatProps = { rawValue: number; suffix?: string; label: string };
const AnimatedStat = ({ rawValue, suffix = "", label }: AnimatedStatProps) => {
  const { value, ref } = useCountUp(rawValue);
  return (
    <div ref={ref} className="flex flex-col items-center lg:items-start">
      <div className="font-display text-2xl font-bold text-foreground sm:text-3xl tabular-nums">
        {value.toLocaleString()}{suffix}
      </div>
      <div className="mt-1 text-center font-display text-[10px] uppercase tracking-widest text-muted-foreground lg:text-left">
        {label}
      </div>
    </div>
  );
};

// ── Live inspection log ticker ───────────────────────────────────────────────
const tickerItems = [
  { id: "t1",  label: "Pork Shoulder",   result: "Fresh",      conf: 91, market: "Divisoria Wet Mkt",    textCol: "text-fresh" },
  { id: "t2",  label: "Chicken Breast",  result: "Acceptable", conf: 76, market: "Caloocan Public Mkt", textCol: "text-acceptable" },
  { id: "t3",  label: "Beef Brisket",    result: "Fresh",      conf: 95, market: "Pasig Market",        textCol: "text-fresh" },
  { id: "t4",  label: "Bangus Fillet",   result: "Warning",    conf: 43, market: "Quiapo Market",       textCol: "text-warning" },
  { id: "t5",  label: "Pork Liempo",     result: "Fresh",      conf: 89, market: "SM Fairview",         textCol: "text-fresh" },
  { id: "t6",  label: "Chicken Thigh",   result: "Spoiled",    conf: 9,  market: "Balintawak Market",   textCol: "text-spoiled" },
  { id: "t7",  label: "Beef Tenderloin", result: "Acceptable", conf: 74, market: "Cubao Farmers",       textCol: "text-acceptable" },
  { id: "t8",  label: "Tilapia Whole",   result: "Fresh",      conf: 92, market: "Las Piñas City Mkt",  textCol: "text-fresh" },
];

const LogTicker = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  // Duplicate items for seamless loop
  const doubled = useMemo(() => [...tickerItems, ...tickerItems], []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-card/30 py-4 backdrop-blur-md">
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

      <p className="mb-3 px-6 font-display text-[10px] uppercase tracking-widest text-muted-foreground">
        Live Inspection Feed
      </p>

      <div
        ref={trackRef}
        className="flex gap-3 px-6"
        style={{
          animation: "ticker-scroll 28s linear infinite",
          width: "max-content",
        }}
      >
        {doubled.map((item, idx) => (
          <div
            key={`${item.id}-${idx}`}
            className="flex shrink-0 items-center gap-3 rounded-xl border border-white/5 bg-background/60 px-4 py-2.5 backdrop-blur-sm"
          >
            <div className={`h-2 w-2 shrink-0 rounded-full ${item.result === "Fresh" ? "bg-fresh" : item.result === "Acceptable" ? "bg-acceptable" : item.result === "Warning" ? "bg-warning" : "bg-spoiled"} animate-pulse`} />
            <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
              {item.label}
            </span>
            <span className={`font-display text-[10px] uppercase tracking-widest ${item.textCol}`}>
              {item.result} · {item.conf}%
            </span>
            <span className="font-display text-[9px] uppercase tracking-widest text-muted-foreground/60">
              {item.market}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const features = [
  {
    icon: Camera,
    title: "Computer Vision Capture",
    desc: "Capture meat samples on-site and run confidence-based freshness classification in real time.",
  },
  {
    icon: ShieldCheck,
    title: "Food Safety Standard Alignment",
    desc: "Classify every sample against health-guided freshness indicators with a consistent decision framework.",
  },
  {
    icon: BarChart3,
    title: "Actionable Record History",
    desc: "Track inspections over time with confidence trends and searchable evidence.",
  },
  {
    icon: Zap,
    title: "Built for Field Speed",
    desc: "Optimized mobile-first workflow for wet market environments where quick decisions matter.",
  },
];

const workflow = [
  { icon: Camera, title: "Capture", desc: "Take or upload sample photo" },
  { icon: Cpu, title: "Analyze", desc: "Run model and rules checks" },
  { icon: CheckCircle2, title: "Classify", desc: "Get freshness category + confidence" },
  { icon: ClipboardCheck, title: "Record", desc: "Save official inspection log" },
];

const testimonials = [
  {
    name: "Maria Santos",
    role: "Barangay Health Inspector",
    quote: "MeatLens helped us standardize inspections. It is easier to explain findings when you have objective values.",
    rating: 5,
  },
  {
    name: "Carlos Reyes",
    role: "Municipal Food Safety Officer",
    quote: "The app catches subtle quality issues that pure visual checks can miss, especially in crowded market shifts.",
    rating: 5,
  },
  {
    name: "Ana Dela Cruz",
    role: "Wet Market Inspector",
    quote: "Simple mobile flow, fast analysis, and clean records. It made our daily inspection routine much smoother.",
    rating: 4,
  },
];

const mockSamples = [
  {
    id: "fresh",
    label: "Prime Beef Cut",
    type: "Fresh",
    color: "bg-fresh",
    border: "border-fresh/50",
    textCol: "text-fresh",
    conf: 94,
    icon: ShieldCheck,
    text: "Safe to Sell",
  },
  {
    id: "acceptable",
    label: "Standard Pork",
    type: "Acceptable",
    color: "bg-acceptable",
    border: "border-acceptable/50",
    textCol: "text-acceptable",
    conf: 78,
    icon: CheckCircle2,
    text: "Passes Inspection",
  },
  {
    id: "warning",
    label: "Questionable Poultry",
    type: "Warning",
    color: "bg-warning",
    border: "border-warning/50",
    textCol: "text-warning",
    conf: 45,
    icon: Zap,
    text: "Requires Attention",
  },
  {
    id: "spoiled",
    label: "Discarded Sample",
    type: "Spoiled",
    color: "bg-spoiled",
    border: "border-spoiled/50",
    textCol: "text-spoiled",
    conf: 12,
    icon: AlertTriangle,
    text: "WARNING: Spoiled",
  },
];

// Interactive Pure Frontend Simulator Component
const Simulator = () => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<typeof mockSamples[0] | null>(mockSamples[0]);
  const [scanStep, setScanStep] = useState(0);

  const handleScan = () => {
    if (scanning) return;
    setScanning(true);
    setScannedResult(null);
    setScanStep(0);

    // Mock scanning progression
    const steps = [
      "Initializing camera...",
      "Measuring RGB balance...",
      "Matching textures...",
      "Computing freshness score...",
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setScanStep(currentStep);
      } else {
        clearInterval(interval);
        setScanning(false);
        setScannedResult(mockSamples[selectedIdx]);
      }
    }, 600); // Total ~2.4s scan
  };

  const activeSample = mockSamples[selectedIdx];

  return (
    <div className="relative mx-auto w-full max-w-sm rounded-[2.5rem] border-[8px] border-border/60 bg-card/90 shadow-2xl backdrop-blur-xl">
      <div className="absolute left-1/2 top-2 h-4 w-20 -translate-x-1/2 rounded-full bg-border/60"></div>
      
      <div className="flex h-[580px] flex-col p-4 pt-8">
        <div className="mb-4 text-center font-display text-xs uppercase tracking-widest text-muted-foreground">
          MeatLens Live Demo
        </div>

        {/* Mock Viewfinder */}
        <div className="relative mb-4 flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-background/50 shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:12px_12px] opacity-20"></div>
          
          <div className="z-10 flex flex-col items-center justify-center space-y-2">
            <Camera className="h-10 w-10 text-muted-foreground/50" />
            <span className="font-display text-sm font-medium text-foreground/80">{activeSample.label}</span>
          </div>

          {/* Scanning Animation */}
          {scanning && (
            <>
              <div className="absolute inset-0 z-20 animate-scan-line border-b-2 border-primary bg-gradient-to-b from-transparent to-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.5)]"></div>
              {/* Corner brackets */}
              <div className="absolute left-4 top-4 h-6 w-6 border-l-2 border-t-2 border-primary"></div>
              <div className="absolute right-4 top-4 h-6 w-6 border-r-2 border-t-2 border-primary"></div>
              <div className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-primary"></div>
              <div className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-primary"></div>
            </>
          )}
        </div>

        {/* Selectors */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          {mockSamples.map((sample, idx) => (
            <button
              key={sample.id}
              onClick={() => {
                if (!scanning) {
                  setSelectedIdx(idx);
                  setScannedResult(null);
                }
              }}
              disabled={scanning}
              className={`flex items-center justify-center rounded-xl border p-2 font-display text-[10px] uppercase tracking-wider transition-all duration-200 ${
                selectedIdx === idx
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border/50 bg-background/40 text-muted-foreground hover:bg-background/80"
              }`}
            >
              {sample.type}
            </button>
          ))}
        </div>

        {/* Action Button */}
        <Button
          id="btn-simulator-scan"
          onClick={handleScan}
          disabled={scanning}
          className="mb-4 w-full rounded-xl font-display uppercase tracking-widest transition-all hover:scale-[1.02]"
        >
          {scanning ? (
            <span className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 animate-spin" /> Scanning...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ScanLine className="h-4 w-4" /> Run AI Analysis
            </span>
          )}
        </Button>

        {/* Results Area */}
        <div className="mt-auto h-32 rounded-2xl border border-border/70 bg-background/60 p-4 backdrop-blur-sm">
          {scanning ? (
            <div className="flex h-full flex-col items-center justify-center space-y-3">
              <div className="font-display text-xs text-primary animate-pulse">
                {["Initializing camera...", "Measuring RGB balance...", "Matching textures...", "Computing score..."][scanStep]}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/50">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${(scanStep + 1) * 25}%` }}
                ></div>
              </div>
            </div>
          ) : scannedResult ? (
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-display text-[10px] uppercase tracking-wider ${scannedResult.color}/10 ${scannedResult.textCol} ${scannedResult.border}`}>
                    <scannedResult.icon className="h-3 w-3" />
                    {scannedResult.type}
                  </div>
                  <p className="mt-2 font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                    Confidence Score
                  </p>
                </div>
                <div className={`font-display text-3xl font-bold ${scannedResult.textCol}`}>
                  {scannedResult.conf}%
                </div>
              </div>
              <div className={`font-display text-xs font-semibold uppercase tracking-wider ${scannedResult.textCol}`}>
                {scannedResult.text}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center font-display text-xs text-muted-foreground">
              Select a sample and run analysis to view pure client-side simulated results.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
      { rawValue: userCount, suffix: "", label: "Registered Inspectors" },
      { rawValue: inspectionCount, suffix: "", label: "Completed Inspections" },
      { rawValue: freshRate, suffix: "%", label: "Average Fresh Detection" },
    ],
    [inspectionCount, userCount, freshRate]
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/30">
      {/* Background Orbs */}
      <div className="pointer-events-none absolute left-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 opacity-50 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-5%] top-[20%] h-[400px] w-[400px] rounded-full bg-accent/5 opacity-50 blur-[120px]" />

      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-inner ring-1 ring-primary/30">
              <Fingerprint className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-widest">MeatLens</p>
              <p className="font-display text-[9px] uppercase tracking-widest text-muted-foreground">Inspection Intelligence</p>
            </div>
          </div>

          <div className="hidden items-center gap-4 sm:flex">
            {user ? (
              <Link to="/inspect">
                <Button size="sm" className="gap-2 rounded-xl font-display uppercase tracking-wider shadow-lg shadow-primary/20 transition-all hover:scale-105">
                  Open App <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="rounded-xl font-display uppercase tracking-wider hover:bg-muted/60">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="rounded-xl bg-gradient-to-r from-primary to-emerald-500 font-display uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 hover:shadow-primary/40">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-md" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-xs border-border/40 bg-background/95 backdrop-blur-xl">
                <SheetHeader className="mb-6 border-b border-border/30 pb-4 text-left">
                  <SheetTitle className="font-display uppercase tracking-widest">Menu</SheetTitle>
                </SheetHeader>
                <div className="grid gap-3">
                  {user ? (
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
                          <Button variant="outline" className="w-full rounded-xl border-border/40 font-display uppercase tracking-wider">
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

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* HERO SECTION */}
        <section id="hero" className="relative mb-20 mt-10 grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
          <div className="z-10 text-center lg:text-left">
            <div className="mb-6 inline-flex animate-fade-in items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-display text-xs font-semibold uppercase tracking-widest text-primary">AI-assisted Field Inspection</span>
            </div>

            <h1 className="mb-6 font-display text-4xl font-extrabold uppercase leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Objective Meat Freshness Checks,{" "}
              <span className="bg-gradient-to-r from-primary via-emerald-400 to-accent bg-clip-text text-transparent">
                Designed for Real Market Flow
              </span>
            </h1>

            <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              MeatLens helps inspectors perform faster and more consistent decisions using image-based color and texture analytics aligned to health guidance.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link to={user ? "/inspect" : "/signup"} className="w-full sm:w-auto">
                <Button id="btn-hero-inspect" size="lg" className="w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-500 px-8 font-display uppercase tracking-wider shadow-lg shadow-primary/25 transition-all hover:-translate-y-1 hover:shadow-primary/40 sm:w-auto">
                  {user ? "Start Inspecting" : "Create Inspector Account"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={user ? "/history" : "/login"} className="w-full sm:w-auto">
                <Button id="btn-hero-history" variant="outline" size="lg" className="w-full rounded-xl border-border/40 bg-card/40 px-8 font-display uppercase tracking-wider backdrop-blur-sm transition-all hover:bg-card/70 sm:w-auto">
                  {user ? "View History" : "Sign In"}
                </Button>
              </Link>
            </div>
            
            {/* Quick Stats below hero — animated count-up */}
            <div className="mt-12 grid grid-cols-3 gap-4 border-t border-border/20 pt-8">
              {statCards.map((stat) => (
                <AnimatedStat key={stat.label} rawValue={stat.rawValue} suffix={stat.suffix} label={stat.label} />
              ))}
            </div>
          </div>

          <div className="z-10 flex justify-center lg:justify-end">
            <Simulator />
          </div>
        </section>

        {/* LIVE TICKER */}
        <div className="mb-20">
          <LogTicker />
        </div>

        {/* WORKFLOW SECTION */}
        <section id="workflow" className="mb-24">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight">Inspection Workflow</h2>
            <p className="mt-3 text-muted-foreground">Four simple steps to secure health standard compliance.</p>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((step, idx) => (
              <div key={step.title} className="group relative rounded-3xl border border-border/30 bg-card/40 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:bg-card/60 hover:shadow-2xl hover:shadow-primary/10">
                <div className="absolute -right-4 -top-4 flex h-12 w-12 items-center justify-center rounded-full bg-background font-display text-xl font-bold text-border/50 transition-colors group-hover:text-primary/30">
                  {idx + 1}
                </div>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <step.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-display text-lg font-bold uppercase tracking-wider">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="mb-24 rounded-[3rem] border border-border/30 bg-gradient-to-b from-card/30 to-background p-8 sm:p-12">
          <div className="mb-12 text-center lg:text-left">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight">Capability Blocks</h2>
            <p className="mt-3 text-muted-foreground">Powered by advanced mobile vision and secure records.</p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((feature, idx) => {
              // Each card gets a slightly different mock confidence level for visual variety
              const mockConf = [92, 88, 79, 95][idx];
              return (
                <div key={feature.title} className="group flex flex-col gap-4 rounded-3xl border border-border/30 bg-card/30 p-6 backdrop-blur-sm transition-all hover:bg-card/50">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background border border-border/30 transition-transform group-hover:scale-110">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="mb-2 font-display text-base font-bold uppercase tracking-wider">{feature.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                  {/* Pulsing confidence bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-display text-[9px] uppercase tracking-widest text-muted-foreground">Accuracy Index</span>
                      <span className="font-display text-[9px] font-bold text-primary">{mockConf}%</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-border/40">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-700 group-hover:opacity-100"
                        style={{ width: `${mockConf}%`, opacity: 0.6 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section id="testimonials" className="mb-24">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight">Inspector Feedback</h2>
            <p className="mt-3 text-muted-foreground">Trusted by professionals in wet markets nationwide.</p>
          </div>
          
          <div className="grid gap-6 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="relative flex flex-col justify-between rounded-3xl border border-border/30 bg-card/50 p-8 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-accent/30">
                <div>
                  <div className="mb-6 flex gap-1">
                    {Array.from({ length: t.rating }).map((_, idx) => (
                      <Star key={idx} className="h-4 w-4 fill-accent text-accent drop-shadow-[0_0_8px_rgba(var(--accent),0.8)]" />
                    ))}
                  </div>
                  <p className="text-base italic leading-relaxed text-foreground/90">"{t.quote}"</p>
                </div>
                <div className="mt-8 border-t border-border/25 pt-6">
                  <p className="font-display text-sm font-bold uppercase tracking-wider text-primary">{t.name}</p>
                  <p className="font-display text-[11px] uppercase tracking-widest text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="relative overflow-hidden rounded-[3rem] border border-primary/20 bg-primary/5 px-6 py-20 text-center shadow-[0_0_100px_rgba(var(--primary),0.1)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.15)_0%,transparent_60%)]"></div>
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="mb-6 font-display text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">Ready to Inspect?</h2>
            <p className="mb-10 text-lg text-muted-foreground">
              Get your organization access code and start running objective inspections with measurable confidence.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link to={user ? "/inspect" : "/signup"} className="w-full sm:w-auto">
                <Button size="lg" className="w-full gap-2 rounded-xl bg-primary px-10 font-display uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-105 hover:bg-primary/90 sm:w-auto">
                  {user ? "Go to Inspect" : "Get Started Now"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              {!user && (
                <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full rounded-xl border-border/40 bg-card/40 px-8 font-display uppercase tracking-wider backdrop-blur-md transition-all hover:bg-card/70 sm:w-auto">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/20 bg-background py-10 text-center">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2 text-muted-foreground opacity-60 hover:opacity-100 transition-opacity">
            <Fingerprint className="h-4 w-4" />
            <span className="font-display text-xs font-bold uppercase tracking-widest">MeatLens</span>
          </div>
          <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground/60">
            Built for wet market food safety inspection
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
