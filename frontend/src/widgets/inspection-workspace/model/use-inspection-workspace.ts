import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/entities/user";
import {
  buildInspectionInsert,
  uploadClient,
  useSubmitInspection,
} from "@/features/inspection-submission";
import { queueScan, removeScan } from "@/features/offline-sync";
import {
  clearDeveloperOptionsSession,
  DEFAULT_DEVELOPER_OPTIONS_FLAGS,
  developerOptionsClient,
  getDeveloperOptionsFlags,
  getDeveloperOptionsSession,
  isDeveloperOptionsSessionExpired,
  saveDeveloperAnalysisSnapshot,
  type DeveloperOptionsFlags,
} from "@/features/developer-tools";
import { marketLocationClient } from "@/entities/market-location";
import { getConfidenceTextClass } from "@/shared/lib/confidence-level";
import {
  PROTOCOL_SPOILED_REASON,
  buildProtocolSpoiledAnalysisResult,
  createEmptyPreScanForm,
  getInspectionDecisionSource,
  hasProtocolFailure,
  isPreScanChecklistComplete as isPreScanChecklistCompleteHelper,
  toInspectionPreScanPayload,
  type InspectionPreScanForm,
} from "@/entities/inspection";
import {
  analyzeOffline,
  getMockOfflineAnalysisResult,
  hasMockOfflineAnalysisResult,
  isModelReady as getAnalysisReady,
  loadActiveAnalysisModel,
  prewarmModel,
  setActiveAnalysisMode,
} from "@/features/offline-analysis";
import { setActiveMobileNetModelVariant } from "@/features/offline-analysis";
import {
  formatInspectionLocationLabel,
  getCoordinateStatusText,
  requestCurrentCoordinates,
  type CoordinateCaptureStatus,
  type InspectionCoordinates,
} from "@/entities/inspection";
import type { AnalysisResult, InspectionDecisionSource } from "@/entities/inspection";
import type { CapturedImagePayload } from "@/features/inspection-capture";
import type { InspectPageViewModel, InspectionSaveStatus } from "./types";
import { useInspectionAnalysis } from "./use-inspection-analysis";
import {
  createClientSubmissionId,
  DEFAULT_MEAT_TYPE,
  FALLBACK_MARKET_LOCATIONS,
  FORCE_RETAKE_CONFIDENCE_THRESHOLD,
  getCaptureStatusText,
  getConfidenceText,
  getSaveButtonLabel,
  normalizeMarketLocationNames,
  resolveSelectedLocation,
} from "./inspect-page";

export function useInspectionWorkspace(): InspectPageViewModel {
  const { user, profile, isAdmin } = useAuth();
  const [capturedInput, setCapturedInput] = useState<CapturedImagePayload | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [preScanForm, setPreScanForm] = useState<InspectionPreScanForm>(() =>
    createEmptyPreScanForm(),
  );
  const [marketLocations, setMarketLocations] = useState<string[]>(FALLBACK_MARKET_LOCATIONS);
  const [selectedLocation, setSelectedLocation] = useState<string>(FALLBACK_MARKET_LOCATIONS[0] ?? "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isModelReady, setIsModelReady] = useState<boolean>(() => !navigator.onLine || getAnalysisReady());
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
  const createInspection = useSubmitInspection();

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
    const useEnsemble = developerFlags.enableModelEnsemble;
    const nextVariant =
      useEnsemble
        ? "seed123_model2"
        : developerFlags.useRoboflowModel3
          ? "roboflow_model3"
          : developerFlags.useSeed123Model2
            ? "seed123_model2"
            : "default";
    setActiveAnalysisMode(useEnsemble ? "ensemble" : "mobilenetv3");
    setActiveMobileNetModelVariant(nextVariant);
    setIsModelReady(!navigator.onLine || getAnalysisReady());

    if (!navigator.onLine) {
      return;
    }

    prewarmModel();
    setIsModelReady(getAnalysisReady());
  }, [developerFlags.enableModelEnsemble, developerFlags.useRoboflowModel3, developerFlags.useSeed123Model2, isAdmin, isDeveloperUnlocked, user]);

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

      if (getAnalysisReady()) {
        updateReadiness(true);
        return;
      }

      updateReadiness(false);
      const loaded = await loadActiveAnalysisModel({ forceRetry: true });
      if (isCancelled) return;

      if (loaded || getAnalysisReady()) {
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
      const hasPreScan =
        preScanPayload.storage_correct != null ||
        preScanPayload.light_color_correct != null ||
        preScanPayload.area_clean != null;
      const regulatoryCompliance = hasPreScan
        ? (preScanPayload.storage_correct === true &&
           preScanPayload.light_color_correct === true &&
           preScanPayload.area_clean === true)
        : null;
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
        regulatoryCompliance,
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

      await createInspection.mutateAsync(
        buildInspectionInsert({
          userId: user.id,
          submissionId,
          capturedAt: capturedInput.capturedAt,
          location: selectedLocation,
          coordinates,
          decisionSource,
          preScanForm,
          result,
          imageUrl,
        }),
      );
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
  const analysisState = useInspectionAnalysis({
    isModelReady,
    isAnalyzing,
    result,
    inspectionDecisionSource,
    online: navigator.onLine,
  });
  const isAnalyzeBlockedByModel = analysisState.isAnalyzeBlockedByModel;
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
    disableRoiSegmentation: developerFlags.disableRoiSegmentation,
    showAnalyzeAction: Boolean(capturedInput && !result && inspectionDecisionSource !== "protocol_pre_scan"),
    showSaveActions: Boolean(result),
    captureStatusText: getCaptureStatusText(capturedInput),
    analysisStatusText: analysisState.analysisStatusText,
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
