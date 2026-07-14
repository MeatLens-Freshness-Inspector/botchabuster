/**
 * SQLite-backed implementation of the offline scan queue.
 *
 * API is intentionally identical to lib/offlineQueue.ts so the platform
 * branch in that file is a one-liner swap.
 *
 * Schema: pending_scans
 * Migration: android/sql/migrations/001_create_pending_scans.sql
 *
 * imageData (ArrayBuffer) is stored as a Base64 TEXT column because
 * Capacitor's IPC layer serialises all values via JSON; raw binary is
 * re-encoded transparently on write and decoded on read.
 */

import type {
  AnalysisResult,
  InspectionDecisionSource,
  MeatType,
} from "@/types/inspection";
import { openDb } from "./db";

// ---------------------------------------------------------------------------
// Types (mirrors offlineQueue.ts exactly)
// ---------------------------------------------------------------------------

export interface PendingScan {
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

// ---------------------------------------------------------------------------
// Binary helpers
// ---------------------------------------------------------------------------

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function safeParseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

// ---------------------------------------------------------------------------
// Row → PendingScan deserializer
// ---------------------------------------------------------------------------

function rowToScan(row: Record<string, unknown>): PendingScan {
  return {
    id: row["id"] as string,
    imageData: base64ToArrayBuffer(row["image_data"] as string),
    imageType: row["image_type"] as string,
    imageName: row["image_name"] as string,
    meatType: row["meat_type"] as MeatType,
    location: (row["location"] as string | null) ?? null,
    locationLatitude: (row["location_latitude"] as number | null) ?? null,
    locationLongitude: (row["location_longitude"] as number | null) ?? null,
    stallNumber: (row["stall_number"] as string | null) ?? null,
    meatInspectionCertificateProof: (row["meat_inspection_certificate_proof"] as string | null) ?? null,
    meatExpiryDate: (row["meat_expiry_date"] as string | null) ?? null,
    storageCorrect: row["storage_correct"] == null ? null : Boolean(row["storage_correct"]),
    lightColorCorrect: row["light_color_correct"] == null ? null : Boolean(row["light_color_correct"]),
    lightColorObserved: (row["light_color_observed"] as string | null) ?? null,
    areaClean: row["area_clean"] == null ? null : Boolean(row["area_clean"]),
    inspectionDecisionSource: row["inspection_decision_source"] as InspectionDecisionSource,
    protocolSpoiledReason: (row["protocol_spoiled_reason"] as string | null) ?? null,
    capturedAt: (row["captured_at"] as string | null) ?? undefined,
    queuedAt: row["queued_at"] as string,
    userId: row["user_id"] as string,
    analysisResult: safeParseJson<AnalysisResult>(row["analysis_result_json"] as string | null) ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function queueScan(scan: PendingScan): Promise<void> {
  const db = await openDb();
  await db.run(
    `INSERT OR REPLACE INTO pending_scans (
      id, image_data, image_type, image_name, meat_type,
      location, location_latitude, location_longitude,
      stall_number, meat_inspection_certificate_proof, meat_expiry_date,
      storage_correct, light_color_correct, light_color_observed, area_clean,
      inspection_decision_source, protocol_spoiled_reason,
      captured_at, queued_at, user_id, analysis_result_json,
      sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      scan.id,
      arrayBufferToBase64(scan.imageData),
      scan.imageType,
      scan.imageName,
      scan.meatType,
      scan.location,
      scan.locationLatitude,
      scan.locationLongitude,
      scan.stallNumber,
      scan.meatInspectionCertificateProof,
      scan.meatExpiryDate,
      scan.storageCorrect == null ? null : (scan.storageCorrect ? 1 : 0),
      scan.lightColorCorrect == null ? null : (scan.lightColorCorrect ? 1 : 0),
      scan.lightColorObserved,
      scan.areaClean == null ? null : (scan.areaClean ? 1 : 0),
      scan.inspectionDecisionSource,
      scan.protocolSpoiledReason,
      scan.capturedAt ?? null,
      scan.queuedAt,
      scan.userId,
      scan.analysisResult ? JSON.stringify(scan.analysisResult) : null,
    ],
  );
}

export async function getPendingScans(): Promise<PendingScan[]> {
  const db = await openDb();
  const result = await db.query(
    "SELECT * FROM pending_scans WHERE sync_status != 'synced' ORDER BY queued_at ASC",
  );
  return (result.values ?? []).map((row) => rowToScan(row as Record<string, unknown>));
}

export async function removeScan(id: string): Promise<void> {
  const db = await openDb();
  await db.run("DELETE FROM pending_scans WHERE id = ?", [id]);
}

export async function getPendingCount(): Promise<number> {
  const db = await openDb();
  const result = await db.query(
    "SELECT COUNT(*) AS cnt FROM pending_scans WHERE sync_status != 'synced'",
  );
  const row = (result.values ?? [])[0] as Record<string, unknown> | undefined;
  return (row?.["cnt"] as number | null) ?? 0;
}

export async function clearPendingScans(): Promise<void> {
  const db = await openDb();
  await db.run("DELETE FROM pending_scans");
}
