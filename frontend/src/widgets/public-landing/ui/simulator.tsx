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
    <div className="relative mx-auto w-full max-w-md border border-[#17191c] bg-white p-2 shadow-[10px_10px_0_#f0f1f3]">
      <div className="flex h-[580px] flex-col border border-[#d9dee5] bg-white p-5 sm:h-[600px]">
        <div className="mb-5 flex items-center justify-between border-b border-[#d9dee5] pb-3">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#17191c]">
            MeatLens Live Demo
          </div>
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#5d6570]">
            <span className="h-2 w-2 rounded-full bg-[#ff4f00]" />
            Ready
          </div>
        </div>

        <div className="relative mb-4 flex h-52 w-full items-center justify-center overflow-hidden border border-[#d9dee5] bg-[#f7f7f8]">

          <div className="z-10 flex flex-col items-center justify-center space-y-2">
            <Camera className="h-10 w-10 text-[#5d6570]/50" />
            <span className="text-sm font-semibold text-[#17191c]">
              {activeSample.label}
            </span>
            {activeSample.scopeLabel && (
              <span className="text-center text-[9px] font-bold uppercase tracking-[0.12em] text-warning">
                {activeSample.scopeLabel}
              </span>
            )}
          </div>

          {scanning && (
            <>
              <div className="absolute inset-0 z-20 animate-scan-line border-b-2 border-[#ff4f00] bg-[#ff4f00]/10" />
              <div className="absolute left-4 top-4 h-6 w-6 border-l-2 border-t-2 border-[#ff4f00]" />
              <div className="absolute right-4 top-4 h-6 w-6 border-r-2 border-t-2 border-[#ff4f00]" />
              <div className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-[#ff4f00]" />
              <div className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-[#ff4f00]" />
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
              className={`flex items-center justify-center rounded-xl border p-2 text-[10px] font-bold uppercase tracking-[0.1em] transition-all duration-200 ${selectedIdx === index
                ? "border-[#ff4f00] bg-[#ff4f00]/10 text-[#ff4f00]"
                : "border-[#d9dee5] bg-white text-[#5d6570] hover:bg-[#f7f7f8]"
                }`}
              aria-pressed={selectedIdx === index}
            >
              {sample.type}
            </button>
          ))}
        </div>

        <Button
          id="btn-simulator-scan"
          onClick={handleScan}
          disabled={scanning}
          className="mb-4 w-full rounded-lg bg-[#ff4f00] text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#d93f00]"
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

        <div
          className="mt-auto h-32 border border-[#d9dee5] bg-[#f7f7f8] p-4"
          aria-live="polite"
        >
          {scanning ? (
            <div className="flex h-full flex-col items-center justify-center space-y-3">
              <div className="animate-pulse text-xs font-semibold text-[#ff4f00]">
                {scanMessages[scanStep]}
              </div>
              <div className="h-1.5 w-full overflow-hidden bg-[#d9dee5]">
                <div
                  className="h-full bg-[#ff4f00] transition-all duration-500 ease-out"
                  style={{ width: `${(scanStep + 1) * 25}%` }}
                />
              </div>
            </div>
          ) : scannedResult ? (
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${scannedResult.color}/10 ${scannedResult.textCol} ${scannedResult.border}`}
                  >
                    <scannedResult.icon className="h-3 w-3" />
                    {scannedResult.type}
                  </div>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5d6570]">
                    Confidence Score
                  </p>
                  {scannedResult.scopeLabel && (
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-warning">
                      {scannedResult.scopeLabel}
                    </p>
                  )}
                </div>
                <div className={`text-3xl font-bold tracking-[-0.04em] ${scannedResult.textCol}`}>
                  {scannedResult.conf}%
                </div>
              </div>
              <div className={`text-xs font-bold uppercase tracking-[0.12em] ${scannedResult.textCol}`}>
                {scannedResult.text}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-xs text-[#5d6570]">
              Select a sample and run analysis to view pure client-side simulated results.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
