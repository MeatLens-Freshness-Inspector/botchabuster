import type { MeatType, AnalysisResult } from "@/types/inspection";

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
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(scan);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingScans(): Promise<PendingScan[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as PendingScan[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeScan(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearPendingScans(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
