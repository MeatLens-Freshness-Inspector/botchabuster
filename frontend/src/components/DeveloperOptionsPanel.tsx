import { useEffect, useMemo, useState } from "react";
import { LockKeyhole, LockOpen, Upload, Database, Trash2, RefreshCcw, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { developerOptionsClient } from "@/integrations/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  clearDeveloperAnalysisSnapshot,
  clearDeveloperOptionsSession,
  DEFAULT_DEVELOPER_OPTIONS_FLAGS,
  getDeveloperAnalysisSnapshot,
  getDeveloperOptionsFlags,
  getDeveloperOptionsSession,
  isDeveloperOptionsSessionExpired,
  setDeveloperOptionsFlags,
  setDeveloperOptionsSession,
  type DeveloperOptionsFlags,
} from "@/lib/developerOptions";
import { clearPendingScans, getPendingCount, getPendingScans } from "@/lib/offlineQueue";
import { clearPendingAuditLogs, getPendingAuditCount } from "@/lib/offlineAuditQueue";

type FlagDefinition = {
  key: keyof DeveloperOptionsFlags;
  label: string;
  description: string;
};

const FLAG_DEFINITIONS: FlagDefinition[] = [
  {
    key: "enableDebugFileUpload",
    label: "Enable Upload File button",
    description: "Shows file-based capture input on Inspect page (camera-only mode remains default).",
  },
  {
    key: "bypassPreScanChecklist",
    label: "Bypass pre-scan checklist",
    description: "Lets unlocked developers skip the required pre-scan checklist before opening the camera.",
  },
  {
    key: "persistAnalysisSnapshots",
    label: "Persist latest analysis snapshot",
    description: "Stores the most recent analysis payload in local storage for debugging and replay.",
  },
  {
    key: "verboseOfflineSyncLogs",
    label: "Verbose offline sync logging",
    description: "Prints extra sync lifecycle details in browser console.",
  },
  {
    key: "skipModelPrewarm",
    label: "Skip model prewarm on reconnect",
    description: "Disables automatic MobileNetV3 prewarm in OfflineSyncManager online lifecycle.",
  },
  {
    key: "showModelInputPreview",
    label: "Show model input preview",
    description: "Toggles the 224x224 model-preview thumbnail overlay in capture UI.",
  },
  {
    key: "useSeed123Model2",
    label: "Use seed123 primary model",
    description: "When off, fallback to legacy MobileNetV3-small seed42 model for developer comparison.",
  },
];

function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

export function DeveloperOptionsPanel() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(false);
  const [flags, setFlags] = useState<DeveloperOptionsFlags>(DEFAULT_DEVELOPER_OPTIONS_FLAGS);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);
  const [pendingScanCount, setPendingScanCount] = useState(0);
  const [pendingAuditCount, setPendingAuditCount] = useState(0);
  const [isBusyAction, setIsBusyAction] = useState(false);
  const [lastSnapshotAt, setLastSnapshotAt] = useState<string | null>(null);

  const currentUserId = user?.id ?? null;

  const refreshQueueCounts = async (): Promise<void> => {
    const [scanCount, auditCount] = await Promise.all([
      getPendingCount(),
      getPendingAuditCount(),
    ]);
    setPendingScanCount(scanCount);
    setPendingAuditCount(auditCount);
  };

  useEffect(() => {
    if (!currentUserId) return;

    const nextFlags = getDeveloperOptionsFlags(currentUserId);
    setFlags(nextFlags);

    const snapshot = getDeveloperAnalysisSnapshot(currentUserId);
    setLastSnapshotAt(snapshot?.capturedAt ?? null);

    void refreshQueueCounts();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    const existingSession = getDeveloperOptionsSession(currentUserId);
    if (!existingSession) {
      setIsUnlocked(false);
      setSessionExpiresAt(null);
      return;
    }

    if (isDeveloperOptionsSessionExpired(existingSession)) {
      clearDeveloperOptionsSession(currentUserId);
      setIsUnlocked(false);
      setSessionExpiresAt(null);
      return;
    }

    setIsVerifyingSession(true);
    void developerOptionsClient
      .verify(existingSession.token)
      .then((valid) => {
        if (!valid) {
          clearDeveloperOptionsSession(currentUserId);
          setIsUnlocked(false);
          setSessionExpiresAt(null);
          return;
        }

        setIsUnlocked(true);
        setSessionExpiresAt(existingSession.expiresAt);
      })
      .catch(() => {
        clearDeveloperOptionsSession(currentUserId);
        setIsUnlocked(false);
        setSessionExpiresAt(null);
      })
      .finally(() => {
        setIsVerifyingSession(false);
      });
  }, [currentUserId]);

  const lockDeveloperOptions = () => {
    if (!currentUserId) return;
    clearDeveloperOptionsSession(currentUserId);
    setIsUnlocked(false);
    setSessionExpiresAt(null);
    setPassword("");
    toast.info("Developer options locked");
  };

  const handleUnlock = async () => {
    if (!currentUserId) return;
    const trimmed = password.trim();
    if (!trimmed) {
      toast.error("Developer options password is required");
      return;
    }

    setIsUnlocking(true);
    try {
      const response = await developerOptionsClient.unlock(trimmed);
      setDeveloperOptionsSession(currentUserId, {
        token: response.token,
        expiresAt: response.expires_at,
      });
      setIsUnlocked(true);
      setSessionExpiresAt(response.expires_at);
      setPassword("");
      toast.success("Developer options unlocked");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to unlock developer options";
      toast.error(message);
    } finally {
      setIsUnlocking(false);
    }
  };

  const updateFlag = (key: keyof DeveloperOptionsFlags, checked: boolean) => {
    if (!currentUserId) return;
    const nextFlags = { ...flags, [key]: checked };
    setFlags(nextFlags);
    setDeveloperOptionsFlags(currentUserId, nextFlags);
  };

  const handleExportQueue = async () => {
    setIsBusyAction(true);
    try {
      const scans = await getPendingScans();
      const payload = scans.map((scan) => ({
        id: scan.id,
        userId: scan.userId,
        meatType: scan.meatType,
        location: scan.location,
        locationLatitude: scan.locationLatitude,
        locationLongitude: scan.locationLongitude,
        queuedAt: scan.queuedAt,
        capturedAt: scan.capturedAt ?? null,
        imageName: scan.imageName,
        imageType: scan.imageType,
        imageByteLength: scan.imageData.byteLength,
        hasAnalysisResult: Boolean(scan.analysisResult),
        analysisResult: scan.analysisResult ?? null,
      }));
      downloadJson(`meatlens-offline-queue-${Date.now()}.json`, payload);
      toast.success("Offline queue exported");
    } catch {
      toast.error("Failed to export offline queue");
    } finally {
      setIsBusyAction(false);
    }
  };

  const handleClearQueue = async () => {
    setIsBusyAction(true);
    try {
      await clearPendingScans();
      await refreshQueueCounts();
      toast.success("Pending scan queue cleared");
    } catch {
      toast.error("Failed to clear pending scan queue");
    } finally {
      setIsBusyAction(false);
    }
  };

  const handleClearAuditQueue = async () => {
    setIsBusyAction(true);
    try {
      await clearPendingAuditLogs();
      await refreshQueueCounts();
      toast.success("Pending audit queue cleared");
    } catch {
      toast.error("Failed to clear pending audit queue");
    } finally {
      setIsBusyAction(false);
    }
  };

  const handleClearSnapshot = () => {
    if (!currentUserId) return;
    clearDeveloperAnalysisSnapshot(currentUserId);
    setLastSnapshotAt(null);
    toast.success("Saved analysis snapshot cleared");
  };

  const sessionStatusLabel = useMemo(() => {
    if (isVerifyingSession) return "Verifying session...";
    if (!isUnlocked) return "Locked";
    return sessionExpiresAt ? `Unlocked until ${new Date(sessionExpiresAt).toLocaleString()}` : "Unlocked";
  }, [isUnlocked, isVerifyingSession, sessionExpiresAt]);

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="font-display text-sm uppercase tracking-wider">Developer Access</CardTitle>
          <CardDescription className="text-xs">
            Debug features are admin-only and require a developer password before they can be enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {isUnlocked ? <LockOpen className="h-4 w-4 text-fresh" /> : <LockKeyhole className="h-4 w-4" />}
            <span>{sessionStatusLabel}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1">
              <Label htmlFor="dev-options-password" className="text-xs uppercase tracking-widest text-muted-foreground">
                Developer Password
              </Label>
              <Input
                id="dev-options-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter developer options password"
                className="h-10 rounded-xl"
                disabled={isUnlocking}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                className="h-10 rounded-xl"
                onClick={() => void handleUnlock()}
                disabled={isUnlocking}
              >
                {isUnlocking ? "Unlocking..." : "Unlock"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={lockDeveloperOptions}
                disabled={!isUnlocked}
              >
                Lock
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="font-display text-sm uppercase tracking-wider">Developer Toggles</CardTitle>
          <CardDescription className="text-xs">
            Feature flags are stored per admin account in this browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {FLAG_DEFINITIONS.map((definition) => (
            <div key={definition.key} className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/45 p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{definition.label}</p>
                <p className="text-xs text-muted-foreground">{definition.description}</p>
              </div>
              <Switch
                checked={flags[definition.key]}
                onCheckedChange={(checked) => updateFlag(definition.key, checked)}
                disabled={!isUnlocked}
                aria-label={definition.label}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="font-display text-sm uppercase tracking-wider">Debug Utilities</CardTitle>
          <CardDescription className="text-xs">
            Maintain offline queues and snapshots used by debugging workflows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-background/55 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Pending Scans</p>
              <p className="mt-1 font-display text-2xl font-semibold">{pendingScanCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/55 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Pending Audit Logs</p>
              <p className="mt-1 font-display text-2xl font-semibold">{pendingAuditCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/55 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Last Snapshot</p>
              <p className="mt-1 text-xs font-medium">{lastSnapshotAt ? new Date(lastSnapshotAt).toLocaleString() : "None"}</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2 rounded-xl"
              onClick={() => void handleExportQueue()}
              disabled={!isUnlocked || isBusyAction}
            >
              <Upload className="h-4 w-4" />
              Export Offline Queue JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2 rounded-xl"
              onClick={() => void refreshQueueCounts()}
              disabled={isBusyAction}
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh Queue Counters
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2 rounded-xl text-destructive hover:text-destructive"
              onClick={() => void handleClearQueue()}
              disabled={!isUnlocked || isBusyAction}
            >
              <Database className="h-4 w-4" />
              Clear Pending Scan Queue
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2 rounded-xl text-destructive hover:text-destructive"
              onClick={() => void handleClearAuditQueue()}
              disabled={!isUnlocked || isBusyAction}
            >
              <Trash2 className="h-4 w-4" />
              Clear Pending Audit Queue
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2 rounded-xl"
              onClick={handleClearSnapshot}
              disabled={!isUnlocked}
            >
              <FlaskConical className="h-4 w-4" />
              Clear Saved Analysis Snapshot
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
