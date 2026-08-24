import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AnalysisModelSelection } from "@/features/offline-analysis";

const FORCE_RETAKE_CONFIDENCE_THRESHOLD = 80;

type MeatType = "pork" | "beef" | "chicken" | "fish" | "other";
type FreshnessClassification = "fresh" | "not fresh" | "spoiled" | "acceptable" | "warning";
type InspectionDecisionSource = "ai" | "protocol_pre_scan";

type AnalysisResult = {
  classification: FreshnessClassification;
  confidence_score: number;
  flagged_deviations: string[];
  explanation: string;
};

type PendingScan = {
  id: string;
  imageData: ArrayBuffer;
  imageType: string;
  imageName: string;
  meatType: MeatType;
  location: string | null;
  locationLatitude: number | null;
  locationLongitude: number | null;
  stallNumber: string | null;
  meatInspectionCertificateProof: string | null;
  meatExpiryDate: string | null;
  storageCorrect: boolean | null;
  lightColorCorrect: boolean | null;
  lightColorObserved: string | null;
  areaClean: boolean | null;
  inspectionDecisionSource: InspectionDecisionSource;
  protocolSpoiledReason: string | null;
  capturedAt?: string;
  queuedAt: string;
  userId: string;
  analysisResult?: AnalysisResult;
};

type PendingAuditLog = {
  id: string;
  userId: string;
  eventType: string;
  eventTime: string;
  data?: Record<string, unknown>;
  source?: Record<string, unknown>;
};

type OfflineInspectionInsert = {
  user_id: string;
  client_submission_id: string;
  meat_type: MeatType;
  location: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  stall_number: string | null;
  meat_inspection_certificate_proof: string | null;
  meat_expiry_date: string | null;
  storage_correct: boolean | null;
  light_color_correct: boolean | null;
  light_color_observed: string | null;
  area_clean: boolean | null;
  regulatory_compliance: boolean | null;
  inspection_decision_source: InspectionDecisionSource;
  protocol_spoiled_reason: string | null;
  captured_at: string;
  classification: FreshnessClassification;
  confidence_score: number;
  flagged_deviations: string[];
  explanation: string;
  image_url: string | null;
};

type DeveloperOptionsFlags = {
  selectedModel: AnalysisModelSelection;
  verboseOfflineSyncLogs: boolean;
  skipModelPrewarm: boolean;
};

export type OfflineSyncDependencies = {
  uploadInspectionImage: (file: File) => Promise<string>;
  createInspection: (inspection: OfflineInspectionInsert) => Promise<unknown>;
  createAuditBatch: (events: Array<{
    client_event_id: string;
    event_type: string;
    event_time: string;
    data?: Record<string, unknown>;
    source?: Record<string, unknown>;
  }>) => Promise<number>;
  getPendingScans: () => Promise<PendingScan[]>;
  removeScan: (id: string) => Promise<void>;
  getPendingAuditLogs: () => Promise<PendingAuditLog[]>;
  removeAuditLog: (id: string) => Promise<void>;
  protocolSpoiledReason: string;
  buildProtocolSpoiledAnalysisResult: () => AnalysisResult;
  analyzeOffline: (file: File, meatType: MeatType) => Promise<AnalysisResult>;
  prewarmModel: () => void;
  setActiveAnalysisModel: (selection: AnalysisModelSelection) => void;
  getDeveloperOptionsFlags: (userId: string) => DeveloperOptionsFlags;
  getDeveloperOptionsSession: (userId: string) => unknown;
  isDeveloperOptionsSessionExpired: (session: unknown) => boolean;
};

type SyncUser = { id: string };

export function resolveActiveModelSelection(
  user: SyncUser | null,
  isAdmin: boolean,
  developerFlags: Pick<DeveloperOptionsFlags, "selectedModel">,
  isDeveloperUnlocked: boolean,
): AnalysisModelSelection {
  if (!user || !isAdmin || !isDeveloperUnlocked) return "primary";
  return developerFlags.selectedModel;
}

/**
 * Queued scans may already include analysisResult, or only a cached capture.
 * If analysis is missing we run local model inference during sync, then upload
 * and persist the inspection record.
 */
async function processScan(
  scan: PendingScan,
  queryClient: ReturnType<typeof useQueryClient>,
  dependencies: OfflineSyncDependencies,
): Promise<void> {
  const imageFile = new File([scan.imageData], scan.imageName, { type: scan.imageType });
  const result =
    scan.inspectionDecisionSource === "protocol_pre_scan"
      ? dependencies.buildProtocolSpoiledAnalysisResult()
      : scan.analysisResult ?? await dependencies.analyzeOffline(imageFile, scan.meatType);
  const shouldRecommendRetake = result.confidence_score < FORCE_RETAKE_CONFIDENCE_THRESHOLD;

  // Upload image to Supabase Storage (non-fatal).
  let imageUrl: string | null = null;
  try {
    imageUrl = await dependencies.uploadInspectionImage(imageFile);
  } catch {
    // Save without image rather than blocking.
  }

  // Compute regulatory_compliance from the three source boolean checks.
  // NULL when pre-scan was skipped; TRUE only when all three pass.
  const hasPreScan =
    scan.storageCorrect != null ||
    scan.lightColorCorrect != null ||
    scan.areaClean != null;
  const regulatoryCompliance = hasPreScan
    ? (scan.storageCorrect === true && scan.lightColorCorrect === true && scan.areaClean === true)
    : null;

  await dependencies.createInspection({
    user_id: scan.userId,
    client_submission_id: scan.id,
    meat_type: scan.meatType,
    location: scan.location ?? null,
    location_latitude: scan.locationLatitude ?? null,
    location_longitude: scan.locationLongitude ?? null,
    stall_number: scan.stallNumber ?? null,
    meat_inspection_certificate_proof: scan.meatInspectionCertificateProof ?? null,
    meat_expiry_date: scan.meatExpiryDate ?? null,
    storage_correct: scan.storageCorrect ?? null,
    light_color_correct: scan.lightColorCorrect ?? null,
    light_color_observed: scan.lightColorObserved ?? null,
    area_clean: scan.areaClean ?? null,
    regulatory_compliance: regulatoryCompliance,
    inspection_decision_source: scan.inspectionDecisionSource,
    protocol_spoiled_reason:
      scan.inspectionDecisionSource === "protocol_pre_scan"
        ? scan.protocolSpoiledReason ?? dependencies.protocolSpoiledReason
        : null,
    captured_at: scan.capturedAt ?? scan.queuedAt,
    classification: result.classification,
    confidence_score: result.confidence_score,
    flagged_deviations: result.flagged_deviations,
    explanation: result.explanation,
    image_url: imageUrl,
  });

  await dependencies.removeScan(scan.id);

  queryClient.invalidateQueries({ queryKey: ["inspections"] });
  queryClient.invalidateQueries({ queryKey: ["inspection-stats"] });

  const label = scan.meatType.charAt(0).toUpperCase() + scan.meatType.slice(1);
  const locationSuffix = scan.location ? ` @ ${scan.location}` : "";
  if (shouldRecommendRetake) {
    toast.warning(
      `Synced offline scan: ${label}${locationSuffix} - ${result.classification} (${result.confidence_score}%). Retake is recommended.`
    );
    return;
  }
  toast.success(`Synced offline scan: ${label}${locationSuffix} - ${result.classification}`);
}

async function processAuditLogs(logs: PendingAuditLog[], dependencies: OfflineSyncDependencies): Promise<void> {
  if (logs.length === 0) return;

  await dependencies.createAuditBatch(
    logs.map((log) => ({
      client_event_id: log.id,
      event_type: log.eventType,
      event_time: log.eventTime,
      data: log.data,
      source: { ...(log.source ?? {}), is_offline: true },
    })),
  );

  for (const log of logs) {
    await dependencies.removeAuditLog(log.id);
  }
}

/**
 * Mount this component once inside <AuthProvider>.
 * - Drains the offline scan queue when the device comes back online.
 * - Pre-warms the active ONNX model path in the background for the next
 *   offline session.
 */
export type OfflineSyncManagerProps = {
  user: SyncUser | null;
  isAdmin: boolean;
  isOnlineAuthenticated: boolean;
  dependencies: OfflineSyncDependencies;
};

export function OfflineSyncManager({
  user,
  isAdmin,
  isOnlineAuthenticated,
  dependencies,
}: OfflineSyncManagerProps) {
  const queryClient = useQueryClient();
  const isRunning = useRef(false);

  const resolveActiveSelection = (developerFlags: DeveloperOptionsFlags, isDeveloperUnlocked: boolean) =>
    resolveActiveModelSelection(user, isAdmin, developerFlags, isDeveloperUnlocked);

  const drainQueue = async () => {
    if (!navigator.onLine) return;
    if (!user) return;
    if (!isOnlineAuthenticated) return;
    if (isRunning.current) return;

    const developerFlags = dependencies.getDeveloperOptionsFlags(user.id);
    const developerSession = dependencies.getDeveloperOptionsSession(user.id);
    const isDeveloperUnlocked = Boolean(
      developerSession && !dependencies.isDeveloperOptionsSessionExpired(developerSession)
    );
    dependencies.setActiveAnalysisModel(resolveActiveSelection(developerFlags, isDeveloperUnlocked));

    isRunning.current = true;
    try {
      if (developerFlags.verboseOfflineSyncLogs) {
        console.info("[OfflineSyncManager] Queue drain started", { userId: user.id });
      }

      const pendingAuditLogs = await dependencies.getPendingAuditLogs();
      const mineAuditLogs = pendingAuditLogs.filter((log) => log.userId === user.id);
      if (mineAuditLogs.length > 0) {
        if (developerFlags.verboseOfflineSyncLogs) {
          console.info("[OfflineSyncManager] Syncing pending audit logs", { count: mineAuditLogs.length });
        }
        await processAuditLogs(mineAuditLogs, dependencies);
      }

      const pending = await dependencies.getPendingScans();
      const mine = pending.filter((s) => s.userId === user.id);
      if (mine.length === 0) return;

      toast.info(`Syncing ${mine.length} queued scan${mine.length > 1 ? "s" : ""}...`);

      for (const scan of mine) {
        try {
          if (developerFlags.verboseOfflineSyncLogs) {
            console.info("[OfflineSyncManager] Syncing pending scan", { id: scan.id });
          }
          await processScan(scan, queryClient, dependencies);
        } catch (err) {
          console.error("[OfflineSyncManager] Failed to sync scan:", err);
          toast.error("A queued scan failed to sync - will retry when reconnected.");
          break;
        }
      }
    } finally {
      if (developerFlags.verboseOfflineSyncLogs) {
        console.info("[OfflineSyncManager] Queue drain finished", { userId: user.id });
      }
      isRunning.current = false;
    }
  };

  useEffect(() => {
    const maybePrewarm = () => {
      if (!user) {
        dependencies.setActiveAnalysisModel("primary");
        dependencies.prewarmModel();
        return;
      }

      const developerFlags = dependencies.getDeveloperOptionsFlags(user.id);
      const developerSession = dependencies.getDeveloperOptionsSession(user.id);
      const isDeveloperUnlocked = Boolean(
        developerSession && !dependencies.isDeveloperOptionsSessionExpired(developerSession)
      );
      dependencies.setActiveAnalysisModel(resolveActiveSelection(developerFlags, isDeveloperUnlocked));
      if (developerFlags.skipModelPrewarm) {
        if (developerFlags.verboseOfflineSyncLogs) {
          console.info("[OfflineSyncManager] Skipping model prewarm due to developer option");
        }
        return;
      }

      dependencies.prewarmModel();
    };

    void drainQueue();
    // Start loading MobileNetV3 weights while online.
    maybePrewarm();

    const handleOnline = () => {
      void drainQueue();
      maybePrewarm();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencies, isAdmin, isOnlineAuthenticated, user?.id]);

  return null;
}
