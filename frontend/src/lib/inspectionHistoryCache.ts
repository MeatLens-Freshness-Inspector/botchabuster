import type { FreshnessClassification, Inspection } from "@/types/inspection";

const DB_NAME = "meatlens-inspection-history";
const DB_VERSION = 1;
const INSPECTION_LIST_STORE = "inspection-lists";
const INSPECTION_STATS_STORE = "inspection-stats";

type InspectionHistoryScope = "mine" | "all";

export interface InspectionHistoryStats {
  total: number;
  byClassification: Record<FreshnessClassification, number>;
}

interface CachedInspectionListRecord {
  key: string;
  userId: string;
  scope: InspectionHistoryScope;
  updatedAt: string;
  inspections: Inspection[];
}

interface CachedInspectionStatsRecord {
  key: string;
  userId: string;
  scope: InspectionHistoryScope;
  updatedAt: string;
  stats: InspectionHistoryStats;
}

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function buildCacheKey(userId: string, scope: InspectionHistoryScope): string {
  return `${userId}:${scope}`;
}

function openDb(): Promise<IDBDatabase | null> {
  if (!canUseIndexedDb()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(INSPECTION_LIST_STORE)) {
        db.createObjectStore(INSPECTION_LIST_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(INSPECTION_STATS_STORE)) {
        db.createObjectStore(INSPECTION_STATS_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function buildInspectionHistoryStats(inspections: Inspection[]): InspectionHistoryStats {
  const byClassification: Record<FreshnessClassification, number> = {
    fresh: 0,
    "not fresh": 0,
    acceptable: 0,
    warning: 0,
    spoiled: 0,
  };

  for (const inspection of inspections) {
    byClassification[inspection.classification] += 1;
  }

  return {
    total: inspections.length,
    byClassification,
  };
}

export async function getCachedInspectionList(
  userId: string,
  scope: InspectionHistoryScope = "mine",
): Promise<Inspection[] | null> {
  const db = await openDb();
  if (!db) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(INSPECTION_LIST_STORE, "readonly");
    const request = tx.objectStore(INSPECTION_LIST_STORE).get(buildCacheKey(userId, scope));

    request.onsuccess = () => {
      const record = request.result as CachedInspectionListRecord | undefined;
      resolve(record?.inspections ?? null);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function setCachedInspectionList(
  userId: string,
  inspections: Inspection[],
  scope: InspectionHistoryScope = "mine",
): Promise<void> {
  const db = await openDb();
  if (!db) {
    return;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(INSPECTION_LIST_STORE, "readwrite");
    tx.objectStore(INSPECTION_LIST_STORE).put({
      key: buildCacheKey(userId, scope),
      userId,
      scope,
      updatedAt: new Date().toISOString(),
      inspections,
    } satisfies CachedInspectionListRecord);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function upsertCachedInspection(
  userId: string,
  inspection: Inspection,
  scope: InspectionHistoryScope = "mine",
): Promise<void> {
  const cachedInspections = (await getCachedInspectionList(userId, scope)) ?? [];
  const nextInspections = [inspection, ...cachedInspections.filter((item) => item.id !== inspection.id)];
  await setCachedInspectionList(userId, nextInspections, scope);
}

export async function getCachedInspection(
  userId: string,
  inspectionId: string,
  scope: InspectionHistoryScope = "mine",
): Promise<Inspection | null> {
  const inspections = await getCachedInspectionList(userId, scope);
  return inspections?.find((inspection) => inspection.id === inspectionId) ?? null;
}

export async function getCachedInspectionStats(
  userId: string,
  scope: InspectionHistoryScope = "mine",
): Promise<InspectionHistoryStats | null> {
  const db = await openDb();
  if (!db) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(INSPECTION_STATS_STORE, "readonly");
    const request = tx.objectStore(INSPECTION_STATS_STORE).get(buildCacheKey(userId, scope));

    request.onsuccess = () => {
      const record = request.result as CachedInspectionStatsRecord | undefined;
      resolve(record?.stats ?? null);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function setCachedInspectionStats(
  userId: string,
  stats: InspectionHistoryStats,
  scope: InspectionHistoryScope = "mine",
): Promise<void> {
  const db = await openDb();
  if (!db) {
    return;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(INSPECTION_STATS_STORE, "readwrite");
    tx.objectStore(INSPECTION_STATS_STORE).put({
      key: buildCacheKey(userId, scope),
      userId,
      scope,
      updatedAt: new Date().toISOString(),
      stats,
    } satisfies CachedInspectionStatsRecord);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
