import { useState, useCallback, useRef, useEffect } from "react";
import { CameraCapture, type CapturedImagePayload } from "@/components/CameraCapture";
import { CalibrationBanner } from "@/components/CalibrationBanner";
import { AnalysisResultCard } from "@/components/AnalysisResultCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateInspection } from "@/hooks/useInspections";
import type { AnalysisResult, MeatType } from "@/types/inspection";
import { marketLocationClient } from "@/integrations/api/MarketLocationClient";
import { Loader2, Save, RotateCcw, Microscope, TestTube2, Camera, ScanLine, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { uploadClient } from "@/integrations/api";
import { developerOptionsClient } from "@/integrations/api/DeveloperOptionsClient";
import { getConfidenceTextClass } from "@/lib/confidenceLevel";
import { queueScan, removeScan } from "@/lib/offlineQueue";
import { analyzeOffline } from "@/lib/offlineAnalysis";
import { loadMobileNetV3, isModelReady as getMobileNetModelReady } from "@/lib/offlineAnalysis/mobileNetV3";
import { DEFAULT_MARKET_LOCATIONS } from "@/lib/marketLocations";
import {
  clearDeveloperOptionsSession,
  DEFAULT_DEVELOPER_OPTIONS_FLAGS,
  getDeveloperOptionsFlags,
  getDeveloperOptionsSession,
  isDeveloperOptionsSessionExpired,
  saveDeveloperAnalysisSnapshot,
  type DeveloperOptionsFlags,
} from "@/lib/developerOptions";

const DEFAULT_MEAT_TYPE: MeatType = "pork";
const FALLBACK_MARKET_LOCATIONS = [...DEFAULT_MARKET_LOCATIONS];
const FORCE_RETAKE_CONFIDENCE_THRESHOLD = 80;

const InspectPage = () => {
  const { user, profile, isAdmin } = useAuth();
  const [capturedInput, setCapturedInput] = useState<CapturedImagePayload | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [marketLocations, setMarketLocations] = useState<string[]>(FALLBACK_MARKET_LOCATIONS);
  const [selectedLocation, setSelectedLocation] = useState<string>(FALLBACK_MARKET_LOCATIONS[0] ?? "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isModelReady, setIsModelReady] = useState<boolean>(() => !navigator.onLine || getMobileNetModelReady());
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "queued">("idle");
  const [clientSubmissionId, setClientSubmissionId] = useState<string | null>(null);
  const [developerFlags, setDeveloperFlags] = useState<DeveloperOptionsFlags>(DEFAULT_DEVELOPER_OPTIONS_FLAGS);
  const [isDeveloperUnlocked, setIsDeveloperUnlocked] = useState(false);
  const saveLockRef = useRef(false);
  const autoSaveAttemptedRef = useRef(false);
  const createInspection = useCreateInspection();

  useEffect(() => {
    if (!user || !isAdmin) {
      setDeveloperFlags(DEFAULT_DEVELOPER_OPTIONS_FLAGS);
      setIsDeveloperUnlocked(false);
      return;
    }

    const flags = getDeveloperOptionsFlags(user.id);
    setDeveloperFlags(flags);

    const session = getDeveloperOptionsSession(user.id);
    if (!session || isDeveloperOptionsSessionExpired(session)) {
      if (session) {
        clearDeveloperOptionsSession(user.id);
      }
      setIsDeveloperUnlocked(false);
      return;
    }

    setIsDeveloperUnlocked(true);

    if (!navigator.onLine) {
      return;
    }

    void developerOptionsClient.verify(session.token).then((valid) => {
      if (valid) return;
      clearDeveloperOptionsSession(user.id);
      setIsDeveloperUnlocked(false);
    }).catch(() => {
      // Keep local unlocked session while offline verification is unavailable.
    });
  }, [isAdmin, user]);

  const isDebugFileUploadEnabled = Boolean(
    user &&
    isAdmin &&
    isDeveloperUnlocked &&
    developerFlags.enableDebugFileUpload,
  );
  const confidenceSummaryClass = result ? getConfidenceTextClass(result.confidence_score) : "";

  useEffect(() => {
    let isCancelled = false;
    let retryTimerId: number | null = null;

    const updateReadiness = (ready: boolean) => {
      if (isCancelled) return;
      setIsModelReady(!navigator.onLine || ready);
    };

    const warmup = async () => {
      if (!navigator.onLine) {
        updateReadiness(true);
        return;
      }

      if (getMobileNetModelReady()) {
        updateReadiness(true);
        return;
      }

      updateReadiness(false);
      const loaded = await loadMobileNetV3({ forceRetry: true });
      if (isCancelled) return;

      if (loaded || getMobileNetModelReady()) {
        updateReadiness(true);
        return;
      }

      retryTimerId = window.setTimeout(() => {
        void warmup();
      }, 1500);
    };

    const handleOnline = () => {
      void warmup();
    };

    const handleOffline = () => {
      updateReadiness(true);
    };

    void warmup();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      isCancelled = true;
      if (retryTimerId !== null) {
        window.clearTimeout(retryTimerId);
      }
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadMarketLocations = async () => {
      try {
        const locationRows = await marketLocationClient.getAll();
        if (isCancelled) return;

        const normalizedNames = locationRows
          .map((row) => row.name.trim().replace(/\s+/g, " "))
          .filter(Boolean);

        const nextLocations = normalizedNames.length > 0
          ? Array.from(new Set(normalizedNames))
          : FALLBACK_MARKET_LOCATIONS;

        setMarketLocations(nextLocations);
        setSelectedLocation((current) => (nextLocations.some((name) => name === current) ? current : nextLocations[0] ?? ""));
      } catch {
        if (isCancelled) return;
        setMarketLocations(FALLBACK_MARKET_LOCATIONS);
        setSelectedLocation((current) => (FALLBACK_MARKET_LOCATIONS.some((name) => name === current) ? current : FALLBACK_MARKET_LOCATIONS[0] ?? ""));
      }
    };

    void loadMarketLocations();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleCapture = useCallback((capture: CapturedImagePayload) => {
    if (saveStatus === "saving") return;

    const submissionId = createClientSubmissionId();
    setCapturedInput(capture);
    setResult(null);
    setSaveStatus("idle");
    saveLockRef.current = false;
    autoSaveAttemptedRef.current = false;
    setClientSubmissionId(submissionId);

    if (!navigator.onLine && user) {
      void (async () => {
        try {
          const imageData = await capture.file.arrayBuffer();
          await queueScan({
            id: submissionId,
            imageData,
            imageType: capture.file.type,
            imageName: capture.file.name,
            meatType: DEFAULT_MEAT_TYPE,
            location: selectedLocation.trim() || null,
            capturedAt: capture.capturedAt,
            queuedAt: new Date().toISOString(),
            userId: user.id,
          });
          toast.info("Captured offline - image cached locally for sync.");
        } catch {
          toast.error("Failed to cache offline capture.");
        }
      })();
    }
  }, [saveStatus, selectedLocation, user]);


  const handleAnalyze = useCallback(async () => {
    if (!capturedInput?.file) return;
    if (navigator.onLine && !isModelReady) {
      toast.info("Preparing MobileNetV3 model. Please wait a moment.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysisResult: AnalysisResult = await analyzeOffline(capturedInput.file, DEFAULT_MEAT_TYPE, {
        guideBox: capturedInput.guideBox,
      });

      if (analysisResult.confidence_score < FORCE_RETAKE_CONFIDENCE_THRESHOLD) {
        if (!navigator.onLine && clientSubmissionId) {
          try {
            await removeScan(clientSubmissionId);
          } catch {
            // Keep analysis flow even if local queue cleanup fails.
          }
        }

        toast.warning(
          `Confidence ${analysisResult.confidence_score}% is below ${FORCE_RETAKE_CONFIDENCE_THRESHOLD}%. Retake is strongly recommended, but you may save manually if needed.`
        );
      } else {
        toast.success("MobileNetV3 ONNX analysis complete.");
      }

      setResult(analysisResult);
      if (user && isAdmin && isDeveloperUnlocked && developerFlags.persistAnalysisSnapshots) {
        saveDeveloperAnalysisSnapshot(user.id, {
          capturedAt: capturedInput.capturedAt,
          source: capturedInput.source,
          meatType: DEFAULT_MEAT_TYPE,
          location: selectedLocation.trim() || null,
          result: analysisResult,
        });
      }
    } catch (error) {
      setResult(null);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Analysis failed");
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    clientSubmissionId,
    capturedInput,
    developerFlags.persistAnalysisSnapshots,
    isAdmin,
    isDeveloperUnlocked,
    isModelReady,
    selectedLocation,
    user,
  ]);

  const handleSave = useCallback(async () => {
    if (!result || !capturedInput?.file || saveLockRef.current || saveStatus === "saved" || saveStatus === "queued") return;
    if (!user) {
      toast.error("Please sign in to save inspections");
      return;
    }

    const submissionId = clientSubmissionId ?? createClientSubmissionId();
    setClientSubmissionId(submissionId);

    // Offline path: queue with already-computed result.
    if (!navigator.onLine) {
      try {
        const imageData = await capturedInput.file.arrayBuffer();
        await queueScan({
          id: submissionId,
          imageData,
          imageType: capturedInput.file.type,
          imageName: capturedInput.file.name,
          meatType: DEFAULT_MEAT_TYPE,
          location: selectedLocation.trim() || null,
          capturedAt: capturedInput.capturedAt,
          queuedAt: new Date().toISOString(),
          userId: user.id,
          analysisResult: result,
        });
        setSaveStatus("queued");
        toast.info("You're offline - save queued. It will upload and record when you reconnect.");
      } catch {
        toast.error("Failed to queue save for offline storage.");
      }
      return;
    }

    // Online path.
    saveLockRef.current = true;
    setSaveStatus("saving");

    try {
      let imageUrl: string | null = null;
      try {
        imageUrl = await uploadClient.uploadInspectionImage(capturedInput.file, user.id);
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        toast.warning("Image upload failed, saving without image");
      }

      await createInspection.mutateAsync({
        user_id: user.id,
        client_submission_id: submissionId,
        meat_type: DEFAULT_MEAT_TYPE,
        location: selectedLocation.trim() || null,
        captured_at: capturedInput.capturedAt,
        classification: result.classification,
        confidence_score: result.confidence_score,
        flagged_deviations: result.flagged_deviations,
        explanation: result.explanation,
        image_url: imageUrl,
      });
      setSaveStatus("saved");
      toast.success("Inspection saved");
    } catch (error) {
      saveLockRef.current = false;
      setSaveStatus("idle");
      console.error("Save error:", error);
      toast.error("Failed to save inspection");
    }
  }, [result, createInspection, user, capturedInput, clientSubmissionId, saveStatus, selectedLocation]);

  useEffect(() => {
    if (!result || !capturedInput?.file || !user) return;
    if (result.confidence_score < FORCE_RETAKE_CONFIDENCE_THRESHOLD) return;
    if (saveStatus !== "idle") return;
    if (saveLockRef.current || autoSaveAttemptedRef.current) return;

    autoSaveAttemptedRef.current = true;
    void handleSave();
  }, [capturedInput, handleSave, result, saveStatus, user]);

  const handleReset = useCallback(() => {
    setCapturedInput(null);
    setResult(null);
    setSaveStatus("idle");
    saveLockRef.current = false;
    autoSaveAttemptedRef.current = false;
    setClientSubmissionId(null);
  }, []);


  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto w-full max-w-6xl min-w-0 px-4 pt-4">
        <section className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-[0_24px_70px_-34px_rgba(0,0,0,0.65)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)]">
                <Microscope className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold tracking-tight">Inspect</h1>
                <p className="text-xs text-muted-foreground">Capture, analyze, and classify meat freshness</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Market Location</p>
              <p className="mt-1 truncate font-display text-2xl font-semibold">{selectedLocation || "--"}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Capture Status</p>
              <p className="mt-1 font-display text-2xl font-semibold">{capturedInput ? "Ready" : "Waiting"}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Analysis Status</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {isAnalyzing ? "Running" : result ? result.classification : "Pending"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Confidence</p>
              <p className={`mt-1 font-display text-2xl font-semibold ${confidenceSummaryClass}`}>
                {result ? `${result.confidence_score}%` : "--"}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="min-w-0 rounded-3xl border border-border/70 bg-card/92 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-display uppercase tracking-wider text-muted-foreground">
              <TestTube2 className="h-4 w-4" />
              Capture Station
            </div>

            <div className="mb-4 space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Location Selection</Label>
              <Select
                value={selectedLocation}
                onValueChange={setSelectedLocation}
                disabled={saveStatus === "saving" || createInspection.isPending || marketLocations.length === 0}
              >
                <SelectTrigger className="h-10 rounded-xl bg-background/60">
                  <SelectValue placeholder="Select market location" />
                </SelectTrigger>
                <SelectContent>
                  {marketLocations.map((locationName) => (
                    <SelectItem key={locationName} value={locationName}>
                      {locationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <CalibrationBanner />

            <CameraCapture
              onCapture={handleCapture}
              disabled={saveStatus === "saving" || createInspection.isPending}
              allowFileUpload={isDebugFileUploadEnabled}
              showModelInputPreview={developerFlags.showModelInputPreview}
            />

            {capturedInput && !result && (
              <div className="mt-4">
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || (navigator.onLine && !isModelReady)}
                  size="lg"
                  className="w-full gap-2 rounded-xl font-display uppercase tracking-wider"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Analyzing sample...
                    </>
                ) : navigator.onLine && !isModelReady ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Preparing MobileNetV3...
                  </>
                ) : (
                    <>
                      <ScanLine className="h-5 w-5" /> Analyze Sample
                    </>
                  )}
                </Button>
              </div>
            )}
          </section>

          <section className="min-w-0 rounded-3xl border border-border/70 bg-card/92 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold">Analysis Output</h2>
              <span className="rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                {result ? "Ready" : "Awaiting"}
              </span>
            </div>

            {result ? (
              <AnalysisResultCard result={result} showDetailedResults={Boolean(profile?.show_detailed_results)} />
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border/70 bg-background/50 text-center text-muted-foreground">
                <Camera className="mb-3 h-10 w-10" />
                <p className="font-display text-sm uppercase tracking-wider">No analysis yet</p>
                <p className="mt-1 max-w-xs text-xs">Capture a sample and run analysis to view freshness classification and metrics.</p>
              </div>
            )}
          </section>
        </div>

        {result && (
          <section className="mt-4 rounded-3xl border border-border/70 bg-card/92 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={saveStatus === "saving" || createInspection.isPending}
                className="flex-1 gap-2 rounded-xl"
              >
                <RotateCcw className="h-4 w-4" /> New Scan
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveStatus !== "idle" || createInspection.isPending}
                className="flex-1 gap-2 rounded-xl"
              >
                {saveStatus === "saving" || createInspection.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saveStatus === "queued" ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saveStatus === "saved"
                  ? "Record Saved"
                  : saveStatus === "saving"
                  ? "Saving..."
                  : saveStatus === "queued"
                  ? "Queued for Sync"
                  : "Save Record"}
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default InspectPage;

function createClientSubmissionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const randomNibble = Math.floor(Math.random() * 16);
    const value = char === "x" ? randomNibble : (randomNibble & 0x3) | 0x8;
    return value.toString(16);
  });
}


