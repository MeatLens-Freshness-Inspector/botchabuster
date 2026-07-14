/**
 * SQLite-backed implementation of the offline auth envelope store.
 *
 * API is intentionally identical to lib/offlineAuthEnvelope.ts so
 * the platform branch in that file is a one-liner swap.
 *
 * Schema: offline_auth_envelope (single-row, key = 'current')
 * Migration: android/sql/migrations/003_create_offline_auth_envelope.sql
 */

import type { AuthPrimaryRole, AuthRole, AuthUser } from "@/integrations/api/AuthClient";
import type { Profile } from "@/integrations/api/ProfileClient";
import type { PasswordVerifierRecord } from "@/lib/offlineCredentials";
import type { StoredLocalPasskey } from "@/lib/passkeys/localUnlock";
import { openDb } from "./db";

// ---------------------------------------------------------------------------
// Types (mirrors offlineAuthEnvelope.ts exactly)
// ---------------------------------------------------------------------------

export interface OfflineAuthEnvelope {
  user: AuthUser;
  profile: Profile;
  roles: AuthRole[];
  primaryRole: AuthPrimaryRole;
  isAdmin: boolean;
  isDeveloper: boolean;
  authenticatedAt: string;
  offlineExpiresAt: string;
  offlineUnlockRequired: boolean;
  passwordVerifier: PasswordVerifierRecord | null;
  localPasskey: StoredLocalPasskey | null;
}

const ENVELOPE_KEY = "current";

// ---------------------------------------------------------------------------
// In-memory snapshot (same pattern as the IndexedDB impl)
// ---------------------------------------------------------------------------
let _snapshot: OfflineAuthEnvelope | null = null;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function isAuthRole(v: unknown): v is AuthRole {
  return v === "developer" || v === "admin" || v === "moderator" || v === "user";
}

function normalizeRow(row: Record<string, unknown> | undefined): OfflineAuthEnvelope | null {
  if (!row) return null;

  const user     = safeParseJson<AuthUser>(row["user_json"] as string | null);
  const profile  = safeParseJson<Profile>(row["profile_json"] as string | null);
  const authAt   = row["authenticated_at"] as string | null;
  const expiresAt = row["offline_expires_at"] as string | null;

  if (!user?.id || !profile?.id || !authAt || !expiresAt) return null;

  const storedRoles = (safeParseJson<unknown[]>(row["roles_json"] as string | null) ?? []).filter(isAuthRole);
  const isDeveloper = Boolean(row["is_developer"]) || storedRoles.includes("developer");
  const isAdmin     = isDeveloper || Boolean(row["is_admin"]) || storedRoles.includes("admin");
  const primaryRole: AuthPrimaryRole =
    row["primary_role"] === "developer" ? "developer"
    : row["primary_role"] === "admin"   ? "admin"
    : isDeveloper                       ? "developer"
    : isAdmin                           ? "admin"
    : "inspector";

  return {
    user,
    profile,
    roles: storedRoles.length > 0 ? storedRoles : isDeveloper ? ["developer"] : isAdmin ? ["admin"] : [],
    primaryRole,
    isAdmin,
    isDeveloper,
    authenticatedAt: authAt,
    offlineExpiresAt: expiresAt,
    offlineUnlockRequired: Boolean(row["offline_unlock_required"]),
    passwordVerifier: safeParseJson<PasswordVerifierRecord>(row["password_verifier_json"] as string | null),
    localPasskey: safeParseJson<StoredLocalPasskey>(row["local_passkey_json"] as string | null),
  };
}

function safeParseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getOfflineAuthEnvelopeSnapshot(): OfflineAuthEnvelope | null {
  return _snapshot ? clone(_snapshot) : null;
}

export async function loadOfflineAuthEnvelope(): Promise<OfflineAuthEnvelope | null> {
  const db = await openDb();
  const result = await db.query(
    "SELECT * FROM offline_auth_envelope WHERE envelope_key = ?",
    [ENVELOPE_KEY],
  );

  const row = (result.values ?? [])[0] as Record<string, unknown> | undefined;
  const envelope = normalizeRow(row);
  _snapshot = envelope ? clone(envelope) : null;
  return getOfflineAuthEnvelopeSnapshot();
}

export async function saveOfflineAuthEnvelope(envelope: OfflineAuthEnvelope): Promise<void> {
  _snapshot = clone(envelope);
  const db = await openDb();

  await db.run(
    `INSERT OR REPLACE INTO offline_auth_envelope (
      envelope_key, user_json, profile_json, roles_json, primary_role,
      is_admin, is_developer, authenticated_at, offline_expires_at,
      offline_unlock_required, password_verifier_json, local_passkey_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ENVELOPE_KEY,
      JSON.stringify(envelope.user),
      JSON.stringify(envelope.profile),
      JSON.stringify(envelope.roles),
      envelope.primaryRole,
      envelope.isAdmin ? 1 : 0,
      envelope.isDeveloper ? 1 : 0,
      envelope.authenticatedAt,
      envelope.offlineExpiresAt,
      envelope.offlineUnlockRequired ? 1 : 0,
      envelope.passwordVerifier ? JSON.stringify(envelope.passwordVerifier) : null,
      envelope.localPasskey ? JSON.stringify(envelope.localPasskey) : null,
    ],
  );
}

export async function clearOfflineAuthEnvelope(): Promise<void> {
  _snapshot = null;
  const db = await openDb();
  await db.run("DELETE FROM offline_auth_envelope WHERE envelope_key = ?", [ENVELOPE_KEY]);
}

export async function updateOfflineAuthEnvelope(
  update: (current: OfflineAuthEnvelope | null) => OfflineAuthEnvelope | null,
): Promise<OfflineAuthEnvelope | null> {
  const current = await loadOfflineAuthEnvelope();
  const next = update(current);

  if (!next) {
    await clearOfflineAuthEnvelope();
    return null;
  }

  await saveOfflineAuthEnvelope(next);
  return getOfflineAuthEnvelopeSnapshot();
}

export function isOfflineAuthExpired(
  envelope: Pick<OfflineAuthEnvelope, "offlineExpiresAt">,
  nowMs = Date.now(),
): boolean {
  return Date.parse(envelope.offlineExpiresAt) <= nowMs;
}
