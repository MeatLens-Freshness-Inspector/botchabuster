import { Capacitor } from "@capacitor/core";
import type {
  AnalysisResult,
  InspectionDecisionSource,
  MeatType,
} from "@/types/inspection";
import * as sqliteImpl from "@/lib/sqlite/sqliteOfflineQueue";

const isNative = () => Capacitor.isNativePlatform();

const DB_NAME = "meatlens-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-scans";

/**
 * A scan that was captured while offline.
 * If `analysisResult` is present the analysis already ran (user went offline
 * only during the save step); otherwise the full analyze→upload→save chain
 * is still pending.
 */
export interface PendingScan {
  /** Same value used as `client_submission_id` on the server. */
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
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueScan(scan: PendingScan): Promise<void> {
  if (isNative()) return sqliteImpl.queueScan(scan);

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(scan);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingScans(): Promise<PendingScan[]> {
  if (isNative()) return sqliteImpl.getPendingScans();

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as PendingScan[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeScan(id: string): Promise<void> {
  if (isNative()) return sqliteImpl.removeScan(id);

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCount(): Promise<number> {
  if (isNative()) return sqliteImpl.getPendingCount();

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearPendingScans(): Promise<void> {
  if (isNative()) return sqliteImpl.clearPendingScans();

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
