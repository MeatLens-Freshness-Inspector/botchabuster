/**
 * SQLite database singleton and migration runner.
 *
 * Rule: ANY schema change must be a NEW migration file in
 * android/sql/migrations/ with the next sequence number.
 * Never edit an existing migration file.
 *
 * Execution order (must be respected):
 *   005_create_sync_metadata  ← bootstrap (creates schema_migrations table)
 *   001_create_pending_scans
 *   002_create_pending_audit_logs
 *   003_create_offline_auth_envelope
 *   004_create_inspection_history_cache
 */

import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";

// ---------------------------------------------------------------------------
// Inline migration DDL
// Mirrors android/sql/migrations/ — the files there are the source of truth
// for the Android asset layer; this inline copy is what the JS runtime uses.
// ---------------------------------------------------------------------------

/** Migration 005 — Bootstrap: schema_migrations + sync_metadata */
const DDL_005 = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version     INTEGER NOT NULL PRIMARY KEY,
    description TEXT    NOT NULL,
    applied_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS sync_metadata (
    key        TEXT NOT NULL PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TRIGGER IF NOT EXISTS trg_sync_metadata_updated_at
    AFTER UPDATE ON sync_metadata FOR EACH ROW
  BEGIN
    UPDATE sync_metadata
       SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE key = NEW.key;
  END;
`;

const SYNC_METADATA_SEEDS = [
  ["sync_in_progress",             "false"],
  ["last_scan_sync_at",            ""],
  ["last_audit_sync_at",           ""],
  ["last_inspection_cache_sync_at",""],
  ["db_schema_version",            "5"],
  ["app_version",                  "1.0.0"],
] as const;

/** Migration 001 — pending_scans */
const DDL_001 = `
  CREATE TABLE IF NOT EXISTS pending_scans (
    id                                  TEXT    NOT NULL PRIMARY KEY,
    image_data                          TEXT    NOT NULL,
    image_type                          TEXT    NOT NULL,
    image_name                          TEXT    NOT NULL,
    meat_type                           TEXT    NOT NULL,
    location                            TEXT,
    location_latitude                   REAL,
    location_longitude                  REAL,
    stall_number                        TEXT,
    meat_inspection_certificate_proof   TEXT,
    meat_expiry_date                    TEXT,
    storage_correct                     INTEGER,
    light_color_correct                 INTEGER,
    light_color_observed                TEXT,
    area_clean                          INTEGER,
    inspection_decision_source          TEXT    NOT NULL,
    protocol_spoiled_reason             TEXT,
    captured_at                         TEXT,
    queued_at                           TEXT    NOT NULL,
    user_id                             TEXT    NOT NULL,
    analysis_result_json                TEXT,
    sync_status                         TEXT    NOT NULL DEFAULT 'pending',
    sync_attempts                       INTEGER NOT NULL DEFAULT 0,
    last_synced_at                      TEXT,
    last_sync_error                     TEXT,
    created_at                          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at                          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_pending_scans_sync_status_queued_at
    ON pending_scans (sync_status, queued_at ASC);

  CREATE INDEX IF NOT EXISTS idx_pending_scans_user_id
    ON pending_scans (user_id);

  CREATE TRIGGER IF NOT EXISTS trg_pending_scans_updated_at
    AFTER UPDATE ON pending_scans FOR EACH ROW
  BEGIN
    UPDATE pending_scans
       SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = NEW.id;
  END;
`;

/** Migration 002 — pending_audit_logs */
const DDL_002 = `
  CREATE TABLE IF NOT EXISTS pending_audit_logs (
    id              TEXT    NOT NULL PRIMARY KEY,
    user_id         TEXT    NOT NULL,
    event_type      TEXT    NOT NULL,
    event_time      TEXT    NOT NULL,
    data_json       TEXT,
    source_json     TEXT,
    queued_at       TEXT    NOT NULL,
    sync_status     TEXT    NOT NULL DEFAULT 'pending',
    sync_attempts   INTEGER NOT NULL DEFAULT 0,
    last_synced_at  TEXT,
    last_sync_error TEXT,
    created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_pending_audit_logs_sync_status_queued_at
    ON pending_audit_logs (sync_status, queued_at ASC);

  CREATE INDEX IF NOT EXISTS idx_pending_audit_logs_user_id
    ON pending_audit_logs (user_id);

  CREATE INDEX IF NOT EXISTS idx_pending_audit_logs_event_type
    ON pending_audit_logs (event_type);

  CREATE TRIGGER IF NOT EXISTS trg_pending_audit_logs_updated_at
    AFTER UPDATE ON pending_audit_logs FOR EACH ROW
  BEGIN
    UPDATE pending_audit_logs
       SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = NEW.id;
  END;
`;

/** Migration 003 — offline_auth_envelope */
const DDL_003 = `
  CREATE TABLE IF NOT EXISTS offline_auth_envelope (
    envelope_key                TEXT    NOT NULL PRIMARY KEY DEFAULT 'current',
    user_json                   TEXT    NOT NULL,
    profile_json                TEXT    NOT NULL,
    roles_json                  TEXT    NOT NULL DEFAULT '[]',
    primary_role                TEXT    NOT NULL DEFAULT 'inspector',
    is_admin                    INTEGER NOT NULL DEFAULT 0,
    is_developer                INTEGER NOT NULL DEFAULT 0,
    authenticated_at            TEXT    NOT NULL,
    offline_expires_at          TEXT    NOT NULL,
    offline_unlock_required     INTEGER NOT NULL DEFAULT 0,
    password_verifier_json      TEXT,
    local_passkey_json          TEXT,
    updated_at                  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    created_at                  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_offline_auth_envelope_offline_expires_at
    ON offline_auth_envelope (offline_expires_at);

  CREATE TRIGGER IF NOT EXISTS trg_offline_auth_envelope_updated_at
    AFTER UPDATE ON offline_auth_envelope FOR EACH ROW
  BEGIN
    UPDATE offline_auth_envelope
       SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE envelope_key = NEW.envelope_key;
  END;
`;

/** Migration 004 — inspection_history_cache + inspection_stats_cache */
const DDL_004 = `
  CREATE TABLE IF NOT EXISTS inspection_history_cache (
    cache_key        TEXT    NOT NULL PRIMARY KEY,
    user_id          TEXT    NOT NULL,
    scope            TEXT    NOT NULL DEFAULT 'mine',
    inspections_json TEXT    NOT NULL DEFAULT '[]',
    updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fetched_at_unix  INTEGER,
    created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_inspection_history_cache_user_id
    ON inspection_history_cache (user_id);

  CREATE INDEX IF NOT EXISTS idx_inspection_history_cache_fetched_at_unix
    ON inspection_history_cache (fetched_at_unix);

  CREATE TRIGGER IF NOT EXISTS trg_inspection_history_cache_updated_at
    AFTER UPDATE ON inspection_history_cache FOR EACH ROW
  BEGIN
    UPDATE inspection_history_cache
       SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE cache_key = NEW.cache_key;
  END;

  CREATE TABLE IF NOT EXISTS inspection_stats_cache (
    cache_key       TEXT    NOT NULL PRIMARY KEY,
    user_id         TEXT    NOT NULL,
    scope           TEXT    NOT NULL DEFAULT 'mine',
    stats_json      TEXT    NOT NULL DEFAULT '{}',
    updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fetched_at_unix INTEGER,
    created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_inspection_stats_cache_user_id
    ON inspection_stats_cache (user_id);

  CREATE TRIGGER IF NOT EXISTS trg_inspection_stats_cache_updated_at
    AFTER UPDATE ON inspection_stats_cache FOR EACH ROW
  BEGIN
    UPDATE inspection_stats_cache
       SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE cache_key = NEW.cache_key;
  END;
`;

// ---------------------------------------------------------------------------
// Ordered migration list (version, description, DDL)
// ---------------------------------------------------------------------------
const MIGRATIONS: Array<{ version: number; description: string; ddl: string }> = [
  { version: 1, description: "Create pending_scans table",                                    ddl: DDL_001 },
  { version: 2, description: "Create pending_audit_logs table",                               ddl: DDL_002 },
  { version: 3, description: "Create offline_auth_envelope table",                            ddl: DDL_003 },
  { version: 4, description: "Create inspection_history_cache and inspection_stats_cache",    ddl: DDL_004 },
];

// ---------------------------------------------------------------------------
// Singleton connection
// ---------------------------------------------------------------------------
const _sqlite = new SQLiteConnection(CapacitorSQLite);
const DB_NAME = "meatlens";

let _conn: SQLiteDBConnection | null = null;
let _initPromise: Promise<SQLiteDBConnection> | null = null;

/**
 * Returns the open SQLite connection, initialising and running all pending
 * migrations on first call. Subsequent calls return the cached connection.
 *
 * Only call this from the native (Android/iOS) path — gate with
 * `Capacitor.isNativePlatform()` before calling.
 */
export async function openDb(): Promise<SQLiteDBConnection> {
  if (_conn) return _conn;
  if (_initPromise) return _initPromise;

  _initPromise = _init();
  _conn = await _initPromise;
  return _conn;
}

async function _init(): Promise<SQLiteDBConnection> {
  // createConnection is idempotent when the DB is already open
  const conn = await _sqlite.createConnection(
    DB_NAME,
    false,          // not encrypted
    "no-encryption",
    1,              // db version (internal — we manage schema ourselves)
    false,          // not read-only
  );
  await conn.open();

  // --- Step 1: Bootstrap meta-tables (always safe — IF NOT EXISTS) ----------
  await conn.execute(DDL_005);

  for (const [key, value] of SYNC_METADATA_SEEDS) {
    await conn.run(
      "INSERT OR IGNORE INTO sync_metadata (key, value) VALUES (?, ?)",
      [key, value],
    );
  }

  // --- Step 2: Find which migrations are already applied -------------------
  const result = await conn.query("SELECT version FROM schema_migrations");
  const applied = new Set<number>(
    (result.values ?? []).map((r) => (r as Record<string, unknown>)["version"] as number),
  );

  // --- Step 3: Run pending migrations in order ------------------------------
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;

    await conn.execute(m.ddl);
    await conn.run(
      "INSERT OR IGNORE INTO schema_migrations (version, description) VALUES (?, ?)",
      [m.version, m.description],
    );
  }

  return conn;
}

/**
 * Closes the database connection gracefully. Call on app pause/destroy if
 * needed; ordinary usage does not require explicit closing.
 */
export async function closeDb(): Promise<void> {
  if (!_conn) return;
  await _conn.close();
  await _sqlite.closeConnection(DB_NAME, false);
  _conn = null;
  _initPromise = null;
}
