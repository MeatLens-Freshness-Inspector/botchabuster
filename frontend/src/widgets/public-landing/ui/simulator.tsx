import { useState } from "react";
import { Button } from "@/shared/ui";
import { Camera, RefreshCcw, ScanLine } from "lucide-react";
import type { LandingMockSample } from "../model/types";
import { landingMockSamples } from "../lib/landing-data";

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
    <div className="relative mx-auto w-full max-w-sm border border-border bg-card shadow-xl shadow-background/20">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">
          MeatLens Live Demo
        </span>
        <span className="h-2 w-2 rounded-full bg-primary" aria-label="Demo ready" />
      </div>

      <div className="flex min-h-[580px] flex-col p-4">

        <div className="relative mb-4 flex h-48 w-full items-center justify-center overflow-hidden border border-border/80 bg-background">

          <div className="z-10 flex flex-col items-center justify-center space-y-2">
            <Camera className="h-10 w-10 text-muted-foreground/50" />
            <span className="font-display text-sm font-medium text-foreground/80">
              {activeSample.label}
            </span>
          </div>

          {scanning && (
            <>
              <div className="absolute inset-x-0 top-0 z-20 h-1 animate-scan-line border-b-2 border-primary bg-primary/20 motion-reduce:animate-none" />
              <div className="absolute left-4 top-4 h-6 w-6 border-l-2 border-t-2 border-primary" />
              <div className="absolute right-4 top-4 h-6 w-6 border-r-2 border-t-2 border-primary" />
              <div className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-primary" />
              <div className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-primary" />
            </>
          )}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
              aria-pressed={selectedIdx === index}
              aria-label={`Select ${sample.type} sample`}
              className={`flex items-center justify-center rounded-xl border p-2 font-display text-[10px] uppercase tracking-wider transition-all duration-200 ${selectedIdx === index
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/70 bg-background text-muted-foreground hover:bg-muted"
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
              <RefreshCcw className="h-4 w-4 animate-spin motion-reduce:animate-none" /> Scanning...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ScanLine className="h-4 w-4" /> Run AI Analysis
            </span>
          )}
        </Button>

        <div className="mt-auto min-h-32 border border-border/70 bg-background p-4" aria-live="polite">
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
