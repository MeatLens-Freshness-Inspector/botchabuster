import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { uploadClient } from "@/integrations/api";
import { developerOptionsClient } from "@/integrations/api/DeveloperOptionsClient";
import { marketLocationClient } from "@/integrations/api/MarketLocationClient";
import { useCreateInspection } from "@/hooks/useInspections";
import { getConfidenceTextClass } from "@/lib/confidenceLevel";
import {
  clearDeveloperOptionsSession,
  DEFAULT_DEVELOPER_OPTIONS_FLAGS,
  getDeveloperOptionsFlags,
  getDeveloperOptionsSession,
  isDeveloperOptionsSessionExpired,
  saveDeveloperAnalysisSnapshot,
  type DeveloperOptionsFlags,
} from "@/lib/developerOptions";
import { analyzeOffline } from "@/lib/offlineAnalysis";
import {
  isModelReady as getMobileNetModelReady,
  loadMobileNetV3,
  setActiveMobileNetModelVariant,
} from "@/lib/offlineAnalysis/mobileNetV3";
import { queueScan, removeScan } from "@/lib/offlineQueue";
import type { AnalysisResult } from "@/types/inspection";
import type { CapturedImagePayload } from "@/components/CameraCapture";
import type { InspectPageViewModel, InspectionSaveStatus } from "../types";
import {
  createClientSubmissionId,
  DEFAULT_MEAT_TYPE,
  FALLBACK_MARKET_LOCATIONS,
  FORCE_RETAKE_CONFIDENCE_THRESHOLD,
  getAnalysisStatusText,
  getCaptureStatusText,
  getConfidenceText,
  getSaveButtonLabel,
  normalizeMarketLocationNames,
  resolveSelectedLocation,
} from "../utils/inspectPage";

export function useInspectPage(): InspectPageViewModel {
  const { user, profile, isAdmin } = useAuth();
  const [capturedInput, setCapturedInput] = useState<CapturedImagePayload | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [marketLocations, setMarketLocations] = useState<string[]>(FALLBACK_MARKET_LOCATIONS);
  const [selectedLocation, setSelectedLocation] = useState<string>(FALLBACK_MARKET_LOCATIONS[0] ?? "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isModelReady, setIsModelReady] = useState<boolean>(() => !navigator.onLine || getMobileNetModelReady());
  const [saveStatus, setSaveStatus] = useState<InspectionSaveStatus>("idle");
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

  useEffect(() => {
    const useLegacyOverride =
      Boolean(user && isAdmin && isDeveloperUnlocked) && !developerFlags.useSeed123Model2;
    const nextVariant = useLegacyOverride ? "default" : "seed123_model2";
    setActiveMobileNetModelVariant(nextVariant);
    setIsModelReady(!navigator.onLine || getMobileNetModelReady());

    if (!navigator.onLine) {
      return;
    }

    void loadMobileNetV3({ forceRetry: true }).then((loaded) => {
      setIsModelReady(loaded || getMobileNetModelReady());
    });
  }, [developerFlags.useSeed123Model2, isAdmin, isDeveloperUnlocked, user]);

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

        const nextLocations = normalizeMarketLocationNames(locationRows);
        setMarketLocations(nextLocations);
        setSelectedLocation((current) => resolveSelectedLocation(current, nextLocations));
      } catch {
        if (isCancelled) return;
        setMarketLocations(FALLBACK_MARKET_LOCATIONS);
        setSelectedLocation((current) => resolveSelectedLocation(current, FALLBACK_MARKET_LOCATIONS));
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
          `Confidence ${analysisResult.confidence_score}% is below ${FORCE_RETAKE_CONFIDENCE_THRESHOLD}%. Retake is strongly recommended, but you may save manually if needed.`,
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
    if (!result || !capturedInput?.file || saveLockRef.current || saveStatus === "saved" || saveStatus === "queued") {
      return;
    }
    if (!user) {
      toast.error("Please sign in to save inspections");
      return;
    }

    const submissionId = clientSubmissionId ?? createClientSubmissionId();
    setClientSubmissionId(submissionId);

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
  }, [capturedInput, clientSubmissionId, createInspection, result, saveStatus, selectedLocation, user]);

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

  const isDebugFileUploadEnabled = Boolean(
    user &&
    isAdmin &&
    isDeveloperUnlocked &&
    developerFlags.enableDebugFileUpload,
  );
  const isInAppCameraEnabled = Boolean(
    user &&
    isAdmin &&
    isDeveloperUnlocked,
  );
  const confidenceSummaryClass = result ? getConfidenceTextClass(result.confidence_score) : "";
  const isAnalyzeBlockedByModel = navigator.onLine && !isModelReady;

  return {
    capturedInput,
    result,
    marketLocations,
    selectedLocation,
    isAnalyzing,
    isAnalyzeBlockedByModel,
    isAnalyzeDisabled: isAnalyzing || isAnalyzeBlockedByModel,
    isCaptureDisabled: saveStatus === "saving" || createInspection.isPending,
    isCreateInspectionPending: createInspection.isPending,
    isDebugFileUploadEnabled,
    isInAppCameraEnabled,
    isLocationSelectionDisabled:
      saveStatus === "saving" || createInspection.isPending || marketLocations.length === 0,
    saveStatus,
    showDetailedResults: Boolean(profile?.show_detailed_results),
    showModelInputPreview: developerFlags.showModelInputPreview,
    showAnalyzeAction: Boolean(capturedInput && !result),
    showSaveActions: Boolean(result),
    captureStatusText: getCaptureStatusText(capturedInput),
    analysisStatusText: getAnalysisStatusText(isAnalyzing, result),
    confidenceText: getConfidenceText(result),
    confidenceSummaryClass,
    saveButtonLabel: getSaveButtonLabel(saveStatus),
    onSelectedLocationChange: setSelectedLocation,
    onCapture: handleCapture,
    onAnalyze: handleAnalyze,
    onReset: handleReset,
    onSave: handleSave,
  };
}
