import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { uploadClient } from "@/integrations/api/UploadClient";
import { inspectionClient } from "@/integrations/api/InspectionClient";
import { auditLogClient } from "@/integrations/api/AuditLogClient";
import { getPendingScans, removeScan, type PendingScan } from "@/lib/offlineQueue";
import { getPendingAuditLogs, removeAuditLog, type PendingAuditLog } from "@/lib/offlineAuditQueue";
import {
  PROTOCOL_SPOILED_REASON,
  buildProtocolSpoiledAnalysisResult,
} from "@/lib/inspectionPreScan";
import { analyzeOffline, prewarmModel } from "@/lib/offlineAnalysis";
import { setActiveMobileNetModelVariant } from "@/lib/offlineAnalysis/mobileNetV3";
import {
  getDeveloperOptionsFlags,
  getDeveloperOptionsSession,
  isDeveloperOptionsSessionExpired,
} from "@/lib/developerOptions";

const FORCE_RETAKE_CONFIDENCE_THRESHOLD = 80;

/**
 * Queued scans may already include analysisResult, or only a cached capture.
 * If analysis is missing we run local model inference during sync, then upload
 * and persist the inspection record.
 */
async function processScan(
  scan: PendingScan,
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  const imageFile = new File([scan.imageData], scan.imageName, { type: scan.imageType });
  const result =
    scan.inspectionDecisionSource === "protocol_pre_scan"
      ? buildProtocolSpoiledAnalysisResult()
      : scan.analysisResult ?? await analyzeOffline(imageFile, scan.meatType);
  const shouldRecommendRetake = result.confidence_score < FORCE_RETAKE_CONFIDENCE_THRESHOLD;

  // Upload image to Supabase Storage (non-fatal).
  let imageUrl: string | null = null;
  try {
    imageUrl = await uploadClient.uploadInspectionImage(imageFile);
  } catch {
    // Save without image rather than blocking.
  }

  await inspectionClient.create({
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
    inspection_decision_source: scan.inspectionDecisionSource,
    protocol_spoiled_reason:
      scan.inspectionDecisionSource === "protocol_pre_scan"
        ? scan.protocolSpoiledReason ?? PROTOCOL_SPOILED_REASON
        : null,
    captured_at: scan.capturedAt ?? scan.queuedAt,
    classification: result.classification,
    confidence_score: result.confidence_score,
    flagged_deviations: result.flagged_deviations,
    explanation: result.explanation,
    image_url: imageUrl,
  });

  await removeScan(scan.id);

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

async function processAuditLogs(logs: PendingAuditLog[]): Promise<void> {
  if (logs.length === 0) return;

  await auditLogClient.createBatch(
    logs.map((log) => ({
      client_event_id: log.id,
      event_type: log.eventType,
      event_time: log.eventTime,
      data: log.data,
      source: { ...(log.source ?? {}), is_offline: true },
    })),
  );

  for (const log of logs) {
    await removeAuditLog(log.id);
  }
}

/**
 * Mount this component once inside <AuthProvider>.
 * - Drains the offline scan queue when the device comes back online.
 * - Pre-warms the MobileNetV3 ONNX model in the background for the next
 *   offline session.
 */
export function OfflineSyncManager() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const isRunning = useRef(false);

  const resolveActiveVariant = () => {
    if (!user) {
      return "seed123_model2" as const;
    }

    if (!isAdmin) {
      return "seed123_model2" as const;
    }

    const developerFlags = getDeveloperOptionsFlags(user.id);
    const developerSession = getDeveloperOptionsSession(user.id);
    const isDeveloperUnlocked = Boolean(
      developerSession && !isDeveloperOptionsSessionExpired(developerSession)
    );

    if (isDeveloperUnlocked && !developerFlags.useSeed123Model2) {
      return "default" as const;
    }

    return "seed123_model2" as const;
  };

  const drainQueue = async () => {
    if (!navigator.onLine) return;
    if (!user) return;
    if (isRunning.current) return;

    const developerFlags = getDeveloperOptionsFlags(user.id);
    setActiveMobileNetModelVariant(resolveActiveVariant());

    isRunning.current = true;
    try {
      if (developerFlags.verboseOfflineSyncLogs) {
        console.info("[OfflineSyncManager] Queue drain started", { userId: user.id });
      }

      const pendingAuditLogs = await getPendingAuditLogs();
      const mineAuditLogs = pendingAuditLogs.filter((log) => log.userId === user.id);
      if (mineAuditLogs.length > 0) {
        if (developerFlags.verboseOfflineSyncLogs) {
          console.info("[OfflineSyncManager] Syncing pending audit logs", { count: mineAuditLogs.length });
        }
        await processAuditLogs(mineAuditLogs);
      }

      const pending = await getPendingScans();
      const mine = pending.filter((s) => s.userId === user.id);
      if (mine.length === 0) return;

      toast.info(`Syncing ${mine.length} queued scan${mine.length > 1 ? "s" : ""}...`);

      for (const scan of mine) {
        try {
          if (developerFlags.verboseOfflineSyncLogs) {
            console.info("[OfflineSyncManager] Syncing pending scan", { id: scan.id });
          }
          await processScan(scan, queryClient);
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
        setActiveMobileNetModelVariant("seed123_model2");
        prewarmModel();
        return;
      }

      const developerFlags = getDeveloperOptionsFlags(user.id);
      setActiveMobileNetModelVariant(resolveActiveVariant());
      if (developerFlags.skipModelPrewarm) {
        if (developerFlags.verboseOfflineSyncLogs) {
          console.info("[OfflineSyncManager] Skipping model prewarm due to developer option");
        }
        return;
      }

      prewarmModel();
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
  }, [isAdmin, user?.id]);

  return null;
}
