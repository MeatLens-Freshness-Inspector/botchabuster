-- =============================================================================
-- Migration 005: Create sync_metadata and schema_migrations tables
-- =============================================================================
-- This migration MUST be run FIRST (before 001–004) because those migrations
-- reference the schema_migrations table for their own INSERT statements.
--
-- Bootstrapping order:
--   1. Run this file to create both meta-tables.
--   2. Run 001, 002, 003, 004 in order.
--
-- Supabase note: Both tables are LOCAL ONLY — no Supabase interaction.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 5a. Schema version / migration tracking
-- ---------------------------------------------------------------------------
-- Records which migration scripts have been applied to this SQLite database.
-- The sync service reads this table on startup to determine which migrations
-- still need to run (similar to Flyway / Liquibase, but minimal).
CREATE TABLE IF NOT EXISTS schema_migrations (
    -- Monotonically increasing migration number (1, 2, 3 …).
    version         INTEGER NOT NULL PRIMARY KEY,

    -- Human-readable description of what this migration does.
    description     TEXT    NOT NULL,

    -- ISO-8601 UTC timestamp when the migration was applied.
    applied_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Seed: record this bootstrap migration itself.
INSERT OR IGNORE INTO schema_migrations (version, description, applied_at)
VALUES (
    5,
    'Create schema_migrations and sync_metadata tables (bootstrap)',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);


-- ---------------------------------------------------------------------------
-- 5b. Generic key-value sync metadata store
-- ---------------------------------------------------------------------------
-- Used by the TypeScript sync service to track cursors, timestamps, and flags
-- without requiring schema changes. Examples of keys stored here:
--
--   Key                          | Example value
--   -----------------------------|------------------------------------------------
--   last_scan_sync_at            | "2025-07-14T10:00:00.000Z"
--   last_audit_sync_at           | "2025-07-14T10:00:00.000Z"
--   last_inspection_cache_sync_at| "2025-07-14T10:00:00.000Z"
--   sync_in_progress             | "false"
--   device_id                    | "abc123-…"  (Capacitor Device.getId())
--   app_version                  | "1.0.0"
--   supabase_project_id          | "cwjkepajlhothqldygfr"   (informational)
--
CREATE TABLE IF NOT EXISTS sync_metadata (
    -- Unique key name (snake_case by convention).
    key         TEXT    NOT NULL PRIMARY KEY,

    -- Value stored as a UTF-8 string. Numbers/booleans must be serialised by
    -- the caller (e.g. "false", "42", "2025-07-14T…").
    value       TEXT    NOT NULL,

    -- ISO-8601 timestamp of the last write.
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Trigger: keep updated_at current on every UPDATE.
CREATE TRIGGER IF NOT EXISTS trg_sync_metadata_updated_at
    AFTER UPDATE ON sync_metadata
    FOR EACH ROW
BEGIN
    UPDATE sync_metadata
       SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE key = NEW.key;
END;

-- Seed well-known keys with safe defaults so the sync service can always
-- do a simple SELECT without first checking for row existence.
INSERT OR IGNORE INTO sync_metadata (key, value)
VALUES
    ('sync_in_progress',            'false'),
    ('last_scan_sync_at',           ''),
    ('last_audit_sync_at',          ''),
    ('last_inspection_cache_sync_at', ''),
    ('db_schema_version',           '5'),
    ('app_version',                 '1.0.0');
