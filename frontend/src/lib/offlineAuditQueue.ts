import { Capacitor } from "@capacitor/core";
import * as sqliteImpl from "@/lib/sqlite/sqliteAuditQueue";

const isNative = () => Capacitor.isNativePlatform();

const DB_NAME = "meatlens-audit-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-audit-logs";

export interface PendingAuditLog {
  id: string;
  userId: string;
  eventType: string;
  eventTime: string;
  data?: Record<string, unknown>;
  source?: Record<string, unknown>;
  queuedAt: string;
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

export async function queueAuditLog(log: PendingAuditLog): Promise<void> {
  if (isNative()) return sqliteImpl.queueAuditLog(log);

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(log);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingAuditLogs(): Promise<PendingAuditLog[]> {
  if (isNative()) return sqliteImpl.getPendingAuditLogs();

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as PendingAuditLog[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeAuditLog(id: string): Promise<void> {
  if (isNative()) return sqliteImpl.removeAuditLog(id);

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingAuditCount(): Promise<number> {
  if (isNative()) return sqliteImpl.getPendingAuditCount();

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearPendingAuditLogs(): Promise<void> {
  if (isNative()) return sqliteImpl.clearPendingAuditLogs();

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
