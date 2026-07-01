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
import {
  PROTOCOL_SPOILED_REASON,
  buildProtocolSpoiledAnalysisResult,
  createEmptyPreScanForm,
  getInspectionDecisionSource,
  hasProtocolFailure,
  isPreScanChecklistComplete as isPreScanChecklistCompleteHelper,
  toInspectionPreScanPayload,
  type InspectionPreScanForm,
} from "@/lib/inspectionPreScan";
import {
  analyzeOffline,
  getMockOfflineAnalysisResult,
  hasMockOfflineAnalysisResult,
} from "@/lib/offlineAnalysis";
import {
  isModelReady as getMobileNetModelReady,
  loadMobileNetV3,
  setActiveMobileNetModelVariant,
} from "@/lib/offlineAnalysis/mobileNetV3";
import { queueScan, removeScan } from "@/lib/offlineQueue";
import {
  formatInspectionLocationLabel,
  getCoordinateStatusText,
  requestCurrentCoordinates,
  type CoordinateCaptureStatus,
  type InspectionCoordinates,
} from "@/lib/inspectionLocation";
import type { AnalysisResult, InspectionDecisionSource } from "@/types/inspection";
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
  const [preScanForm, setPreScanForm] = useState<InspectionPreScanForm>(() =>
    createEmptyPreScanForm(),
  );
  const [marketLocations, setMarketLocations] = useState<string[]>(FALLBACK_MARKET_LOCATIONS);
  const [selectedLocation, setSelectedLocation] = useState<string>(FALLBACK_MARKET_LOCATIONS[0] ?? "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isModelReady, setIsModelReady] = useState<boolean>(() => !navigator.onLine || getMobileNetModelReady());
  const [saveStatus, setSaveStatus] = useState<InspectionSaveStatus>("idle");
  const [clientSubmissionId, setClientSubmissionId] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<InspectionCoordinates | null>(null);
  const [coordinateStatus, setCoordinateStatus] = useState<CoordinateCaptureStatus>("idle");
  const [inspectionDecisionSource, setInspectionDecisionSource] =
    useState<InspectionDecisionSource | null>(null);
  const [developerFlags, setDeveloperFlags] = useState<DeveloperOptionsFlags>(DEFAULT_DEVELOPER_OPTIONS_FLAGS);
  const [isDeveloperUnlocked, setIsDeveloperUnlocked] = useState(false);
  const saveLockRef = useRef(false);
  const autoSaveAttemptedRef = useRef(false);
  const coordinateRequestIdRef = useRef(0);
  const queuedAtRef = useRef<string | null>(null);
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

  const isPreScanBypassed = Boolean(
    user &&
    isAdmin &&
    isDeveloperUnlocked &&
    developerFlags.bypassPreScanChecklist,
  );
  const isPreScanChecklistComplete = isPreScanBypassed
    ? true
    : isPreScanChecklistCompleteHelper(preScanForm);

  const persistPendingScan = useCallback(
    async (
      submissionId: string,
      capture: CapturedImagePayload,
      queuedAt: string,
      analysisResult?: AnalysisResult,
      nextCoordinates?: InspectionCoordinates | null,
    ) => {
      if (!user) {
        return;
      }

      const preScanPayload = toInspectionPreScanPayload(preScanForm);
      const decisionSource =
        inspectionDecisionSource ??
        (isPreScanBypassed ? "ai" : getInspectionDecisionSource(preScanForm));
      const imageData = await capture.file.arrayBuffer();
      await queueScan({
        id: submissionId,
        imageData,
        imageType: capture.file.type,
        imageName: capture.file.name,
        meatType: DEFAULT_MEAT_TYPE,
        location: selectedLocation.trim() || null,
        locationLatitude: nextCoordinates?.latitude ?? null,
        locationLongitude: nextCoordinates?.longitude ?? null,
        stallNumber: preScanPayload.stall_number ?? null,
        meatInspectionCertificateProof:
          preScanPayload.meat_inspection_certificate_proof ?? null,
        meatExpiryDate: preScanPayload.meat_expiry_date ?? null,
        storageCorrect: preScanPayload.storage_correct ?? null,
        lightColorCorrect: preScanPayload.light_color_correct ?? null,
        lightColorObserved: preScanPayload.light_color_observed ?? null,
        areaClean: preScanPayload.area_clean ?? null,
        inspectionDecisionSource: decisionSource,
        protocolSpoiledReason:
          decisionSource === "protocol_pre_scan" ? PROTOCOL_SPOILED_REASON : null,
        capturedAt: capture.capturedAt,
        queuedAt,
        userId: user.id,
        analysisResult,
      });
    },
    [
      inspectionDecisionSource,
      isPreScanBypassed,
      preScanForm,
      selectedLocation,
      user,
    ],
  );

  const handlePreScanFieldChange = useCallback(
    (field: keyof InspectionPreScanForm, value: string) => {
      setPreScanForm((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [],
  );

  const handleCapture = useCallback((capture: CapturedImagePayload) => {
    if (saveStatus === "saving" || !isPreScanChecklistComplete) return;

    const submissionId = createClientSubmissionId();
    const requestId = coordinateRequestIdRef.current + 1;
    const protocolTriggered = !isPreScanBypassed && hasProtocolFailure(preScanForm);
    coordinateRequestIdRef.current = requestId;
    setCapturedInput(capture);
    setResult(protocolTriggered ? buildProtocolSpoiledAnalysisResult() : null);
    setSaveStatus("idle");
    saveLockRef.current = false;
    autoSaveAttemptedRef.current = false;
    setClientSubmissionId(submissionId);
    setCoordinates(null);
    setCoordinateStatus("capturing");
    setInspectionDecisionSource(protocolTriggered ? "protocol_pre_scan" : null);
    queuedAtRef.current = null;
    const mockAnalysisResult = getMockOfflineAnalysisResult();

    void requestCurrentCoordinates().then((nextCoordinates) => {
      if (coordinateRequestIdRef.current !== requestId) {
        return;
      }

      if (nextCoordinates) {
        setCoordinates(nextCoordinates);
        setCoordinateStatus("captured");
      } else {
        setCoordinates(null);
        setCoordinateStatus("unavailable");
      }

      if (!protocolTriggered && mockAnalysisResult) {
        setInspectionDecisionSource("ai");
        setResult(mockAnalysisResult);
      }
    });

    if (!navigator.onLine && user) {
      void (async () => {
        try {
          const queuedAt = new Date().toISOString();
          queuedAtRef.current = queuedAt;
          await persistPendingScan(submissionId, capture, queuedAt);
          toast.info("Captured offline - image cached locally for sync.");
        } catch {
          toast.error("Failed to cache offline capture.");
        }
      })();
    }
  }, [
    isPreScanBypassed,
    isPreScanChecklistComplete,
    persistPendingScan,
    preScanForm,
    saveStatus,
    user,
  ]);

  useEffect(() => {
    if (!capturedInput || !clientSubmissionId || !queuedAtRef.current) {
      return;
    }

    if (coordinates == null && result == null) {
      return;
    }

    void persistPendingScan(
      clientSubmissionId,
      capturedInput,
      queuedAtRef.current,
      result ?? undefined,
      coordinates,
    );
  }, [capturedInput, clientSubmissionId, coordinates, persistPendingScan, result]);

  const handleAnalyze = useCallback(async () => {
    if (!capturedInput?.file) return;
    if (inspectionDecisionSource === "protocol_pre_scan") return;
    if (navigator.onLine && !isModelReady && !hasMockOfflineAnalysisResult()) {
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
            queuedAtRef.current = null;
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

      setInspectionDecisionSource("ai");
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
    inspectionDecisionSource,
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
    const decisionSource = inspectionDecisionSource ?? getInspectionDecisionSource(preScanForm);
    const protocolSpoiledReason =
      decisionSource === "protocol_pre_scan" ? PROTOCOL_SPOILED_REASON : null;
    const preScanPayload = toInspectionPreScanPayload(preScanForm);
    setClientSubmissionId(submissionId);

    if (!navigator.onLine) {
      try {
        const queuedAt = queuedAtRef.current ?? new Date().toISOString();
        queuedAtRef.current = queuedAt;
        await persistPendingScan(submissionId, capturedInput, queuedAt, result, coordinates);
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
        location_latitude: coordinates?.latitude ?? null,
        location_longitude: coordinates?.longitude ?? null,
        ...preScanPayload,
        inspection_decision_source: decisionSource,
        protocol_spoiled_reason: protocolSpoiledReason,
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
  }, [
    capturedInput,
    clientSubmissionId,
    coordinates,
    createInspection,
    inspectionDecisionSource,
    isPreScanBypassed,
    persistPendingScan,
    preScanForm,
    result,
    saveStatus,
    selectedLocation,
    user,
  ]);

  useEffect(() => {
    if (!result || !capturedInput?.file || !user) return;
    if (coordinateStatus === "capturing") return;
    if (saveStatus !== "idle") return;
    if (saveLockRef.current || autoSaveAttemptedRef.current) return;

    const shouldAutoSave =
      inspectionDecisionSource === "protocol_pre_scan" ||
      result.confidence_score >= FORCE_RETAKE_CONFIDENCE_THRESHOLD;
    if (!shouldAutoSave) return;

    autoSaveAttemptedRef.current = true;
    void handleSave();
  }, [
    capturedInput,
    coordinateStatus,
    handleSave,
    inspectionDecisionSource,
    result,
    saveStatus,
    user,
  ]);

  const handleReset = useCallback(() => {
    coordinateRequestIdRef.current += 1;
    setCapturedInput(null);
    setResult(null);
    setPreScanForm(createEmptyPreScanForm());
    setCoordinates(null);
    setCoordinateStatus("idle");
    setInspectionDecisionSource(null);
    setSaveStatus("idle");
    saveLockRef.current = false;
    autoSaveAttemptedRef.current = false;
    setClientSubmissionId(null);
    queuedAtRef.current = null;
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
  const locationDisplayLabel =
    formatInspectionLocationLabel(
      selectedLocation,
      coordinates?.latitude ?? null,
      coordinates?.longitude ?? null,
    ) || selectedLocation;
  const coordinateStatusText =
    coordinateStatus === "captured"
      ? null
      : getCoordinateStatusText(coordinateStatus, coordinates);

  return {
    capturedInput,
    result,
    preScanForm,
    marketLocations,
    selectedLocation,
    locationDisplayLabel,
    coordinateStatusText,
    inspectionDecisionSource,
    isAnalyzing,
    isAnalyzeBlockedByModel,
    isAnalyzeDisabled: isAnalyzing || isAnalyzeBlockedByModel,
    isCaptureDisabled:
      saveStatus === "saving" ||
      createInspection.isPending ||
      !isPreScanChecklistComplete,
    isCreateInspectionPending: createInspection.isPending,
    isDebugFileUploadEnabled,
    isInAppCameraEnabled,
    isPreScanBypassed,
    isPreScanChecklistComplete,
    isLocationSelectionDisabled:
      saveStatus === "saving" || createInspection.isPending || marketLocations.length === 0,
    saveStatus,
    showDetailedResults: Boolean(profile?.show_detailed_results),
    showModelInputPreview: developerFlags.showModelInputPreview,
    showAnalyzeAction: Boolean(capturedInput && !result && inspectionDecisionSource !== "protocol_pre_scan"),
    showSaveActions: Boolean(result),
    captureStatusText: getCaptureStatusText(capturedInput),
    analysisStatusText: getAnalysisStatusText(
      isAnalyzing,
      result,
      inspectionDecisionSource,
    ),
    confidenceText: getConfidenceText(result),
    confidenceSummaryClass,
    saveButtonLabel: getSaveButtonLabel(saveStatus),
    onPreScanFieldChange: handlePreScanFieldChange,
    onSelectedLocationChange: setSelectedLocation,
    onCapture: handleCapture,
    onAnalyze: handleAnalyze,
    onReset: handleReset,
    onSave: handleSave,
  };
}
