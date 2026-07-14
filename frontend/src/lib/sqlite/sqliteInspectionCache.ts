/**
 * SQLite-backed implementation of the inspection history cache.
 *
 * API is intentionally identical to lib/inspectionHistoryCache.ts so the
 * platform branch in that file is a one-liner swap.
 *
 * Schema: inspection_history_cache + inspection_stats_cache
 * Migration: android/sql/migrations/004_create_inspection_history_cache.sql
 */

import type { FreshnessClassification, Inspection } from "@/types/inspection";
import { openDb } from "./db";

// ---------------------------------------------------------------------------
// Types (mirrors inspectionHistoryCache.ts exactly)
// ---------------------------------------------------------------------------

type InspectionHistoryScope = "mine" | "all";

export interface InspectionHistoryStats {
  total: number;
  byClassification: Record<FreshnessClassification, number>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCacheKey(userId: string, scope: InspectionHistoryScope): string {
  return `${userId}:${scope}`;
}

export function buildInspectionHistoryStats(
  inspections: Inspection[],
): InspectionHistoryStats {
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
  return { total: inspections.length, byClassification };
}

function safeParseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

// ---------------------------------------------------------------------------
// Inspection list cache
// ---------------------------------------------------------------------------

export async function getCachedInspectionList(
  userId: string,
  scope: InspectionHistoryScope = "mine",
): Promise<Inspection[] | null> {
  const db = await openDb();
  const result = await db.query(
    "SELECT inspections_json FROM inspection_history_cache WHERE cache_key = ?",
    [buildCacheKey(userId, scope)],
  );

  const row = (result.values ?? [])[0] as Record<string, unknown> | undefined;
  return safeParseJson<Inspection[]>(row?.["inspections_json"] as string | null);
}

export async function setCachedInspectionList(
  userId: string,
  inspections: Inspection[],
  scope: InspectionHistoryScope = "mine",
): Promise<void> {
  const db = await openDb();
  const key = buildCacheKey(userId, scope);
  await db.run(
    `INSERT OR REPLACE INTO inspection_history_cache
      (cache_key, user_id, scope, inspections_json, fetched_at_unix)
     VALUES (?, ?, ?, ?, ?)`,
    [key, userId, scope, JSON.stringify(inspections), Math.floor(Date.now() / 1000)],
  );
}

export async function upsertCachedInspection(
  userId: string,
  inspection: Inspection,
  scope: InspectionHistoryScope = "mine",
): Promise<void> {
  const cached = (await getCachedInspectionList(userId, scope)) ?? [];
  const next = [inspection, ...cached.filter((i) => i.id !== inspection.id)];
  await setCachedInspectionList(userId, next, scope);
}

export async function getCachedInspection(
  userId: string,
  inspectionId: string,
  scope: InspectionHistoryScope = "mine",
): Promise<Inspection | null> {
  const list = await getCachedInspectionList(userId, scope);
  return list?.find((i) => i.id === inspectionId) ?? null;
}

// ---------------------------------------------------------------------------
// Inspection stats cache
// ---------------------------------------------------------------------------

export async function getCachedInspectionStats(
  userId: string,
  scope: InspectionHistoryScope = "mine",
): Promise<InspectionHistoryStats | null> {
  const db = await openDb();
  const result = await db.query(
    "SELECT stats_json FROM inspection_stats_cache WHERE cache_key = ?",
    [buildCacheKey(userId, scope)],
  );

  const row = (result.values ?? [])[0] as Record<string, unknown> | undefined;
  return safeParseJson<InspectionHistoryStats>(row?.["stats_json"] as string | null);
}

export async function setCachedInspectionStats(
  userId: string,
  stats: InspectionHistoryStats,
  scope: InspectionHistoryScope = "mine",
): Promise<void> {
  const db = await openDb();
  const key = buildCacheKey(userId, scope);
  await db.run(
    `INSERT OR REPLACE INTO inspection_stats_cache
      (cache_key, user_id, scope, stats_json, fetched_at_unix)
     VALUES (?, ?, ?, ?, ?)`,
    [key, userId, scope, JSON.stringify(stats), Math.floor(Date.now() / 1000)],
  );
}
