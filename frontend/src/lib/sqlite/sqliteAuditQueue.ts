/**
 * SQLite-backed implementation of the offline audit log queue.
 *
 * API is intentionally identical to lib/offlineAuditQueue.ts so the platform
 * branch in that file is a one-liner swap.
 *
 * Schema: pending_audit_logs
 * Migration: android/sql/migrations/002_create_pending_audit_logs.sql
 */

import { openDb } from "./db";

// ---------------------------------------------------------------------------
// Types (mirrors offlineAuditQueue.ts exactly)
// ---------------------------------------------------------------------------

export interface PendingAuditLog {
  id: string;
  userId: string;
  eventType: string;
  eventTime: string;
  data?: Record<string, unknown>;
  source?: Record<string, unknown>;
  queuedAt: string;
}

// ---------------------------------------------------------------------------
// Row → PendingAuditLog deserializer
// ---------------------------------------------------------------------------

function safeParseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function rowToLog(row: Record<string, unknown>): PendingAuditLog {
  return {
    id:        row["id"]         as string,
    userId:    row["user_id"]    as string,
    eventType: row["event_type"] as string,
    eventTime: row["event_time"] as string,
    data:      safeParseJson<Record<string, unknown>>(row["data_json"] as string | null) ?? undefined,
    source:    safeParseJson<Record<string, unknown>>(row["source_json"] as string | null) ?? undefined,
    queuedAt:  row["queued_at"]  as string,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function queueAuditLog(log: PendingAuditLog): Promise<void> {
  const db = await openDb();
  await db.run(
    `INSERT OR REPLACE INTO pending_audit_logs
      (id, user_id, event_type, event_time, data_json, source_json, queued_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      log.id,
      log.userId,
      log.eventType,
      log.eventTime,
      log.data   ? JSON.stringify(log.data)   : null,
      log.source ? JSON.stringify(log.source) : null,
      log.queuedAt,
    ],
  );
}

export async function getPendingAuditLogs(): Promise<PendingAuditLog[]> {
  const db = await openDb();
  const result = await db.query(
    "SELECT * FROM pending_audit_logs WHERE sync_status != 'synced' ORDER BY queued_at ASC",
  );
  return (result.values ?? []).map((row) => rowToLog(row as Record<string, unknown>));
}

export async function removeAuditLog(id: string): Promise<void> {
  const db = await openDb();
  await db.run("DELETE FROM pending_audit_logs WHERE id = ?", [id]);
}

export async function getPendingAuditCount(): Promise<number> {
  const db = await openDb();
  const result = await db.query(
    "SELECT COUNT(*) AS cnt FROM pending_audit_logs WHERE sync_status != 'synced'",
  );
  const row = (result.values ?? [])[0] as Record<string, unknown> | undefined;
  return (row?.["cnt"] as number | null) ?? 0;
}

export async function clearPendingAuditLogs(): Promise<void> {
  const db = await openDb();
  await db.run("DELETE FROM pending_audit_logs");
}
