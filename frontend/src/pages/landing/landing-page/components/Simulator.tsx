import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCcw, ScanLine } from "lucide-react";
import type { LandingMockSample } from "../../types";
import { landingMockSamples } from "../utils/landingData";

const scanMessages = [
  "Initializing camera...",
  "Measuring RGB balance...",
  "Matching textures...",
  "Computing score...",
];

export function Simulator() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<LandingMockSample | null>(
    landingMockSamples[0],
  );
  const [scanStep, setScanStep] = useState(0);

  const handleScan = () => {
    if (scanning) return;

    setScanning(true);
    setScannedResult(null);
    setScanStep(0);

    let currentStep = 0;
    const interval = window.setInterval(() => {
      currentStep += 1;

      if (currentStep < scanMessages.length) {
        setScanStep(currentStep);
        return;
      }

      window.clearInterval(interval);
      setScanning(false);
      setScannedResult(landingMockSamples[selectedIdx]);
    }, 600);
  };

  const activeSample = landingMockSamples[selectedIdx];

  return (
    <div className="relative mx-auto w-full max-w-sm rounded-[2.5rem] border-[8px] border-border/60 bg-card/90 shadow-2xl backdrop-blur-xl">
      <div className="absolute left-1/2 top-2 h-4 w-20 -translate-x-1/2 rounded-full bg-border/60" />

      <div className="flex h-[580px] flex-col p-4 pt-8">
        <div className="mb-4 text-center font-display text-xs uppercase tracking-widest text-muted-foreground">
          MeatLens Live Demo
        </div>

        <div className="relative mb-4 flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-background/50 shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:12px_12px] opacity-20" />

          <div className="z-10 flex flex-col items-center justify-center space-y-2">
            <Camera className="h-10 w-10 text-muted-foreground/50" />
            <span className="font-display text-sm font-medium text-foreground/80">
              {activeSample.label}
            </span>
          </div>

          {scanning && (
            <>
              <div className="absolute inset-0 z-20 animate-scan-line border-b-2 border-primary bg-gradient-to-b from-transparent to-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
              <div className="absolute left-4 top-4 h-6 w-6 border-l-2 border-t-2 border-primary" />
              <div className="absolute right-4 top-4 h-6 w-6 border-r-2 border-t-2 border-primary" />
              <div className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-primary" />
              <div className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-primary" />
            </>
          )}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {landingMockSamples.map((sample, index) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => {
                if (!scanning) {
                  setSelectedIdx(index);
                  setScannedResult(null);
                }
              }}
              disabled={scanning}
              className={`flex items-center justify-center rounded-xl border p-2 font-display text-[10px] uppercase tracking-wider transition-all duration-200 ${selectedIdx === index
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border/50 bg-background/40 text-muted-foreground hover:bg-background/80"
                }`}
            >
              {sample.type}
            </button>
          ))}
        </div>

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

        <div className="mt-auto h-32 rounded-2xl border border-border/70 bg-background/60 p-4 backdrop-blur-sm">
          {scanning ? (
            <div className="flex h-full flex-col items-center justify-center space-y-3">
              <div className="font-display animate-pulse text-xs text-primary">
                {scanMessages[scanStep]}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/50">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${(scanStep + 1) * 25}%` }}
                />
              </div>
            </div>
          ) : scannedResult ? (
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-display text-[10px] uppercase tracking-wider ${scannedResult.color}/10 ${scannedResult.textCol} ${scannedResult.border}`}
                  >
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
}
