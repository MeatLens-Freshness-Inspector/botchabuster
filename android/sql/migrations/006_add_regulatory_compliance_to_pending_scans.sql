-- =============================================================================
-- Migration 006: Add regulatory_compliance to pending_scans
-- =============================================================================
-- Mirrors the new regulatory_compliance BOOLEAN column added to the Supabase
-- inspections table in:
--   backend/supabase/migrations/20260805160000_add_regulatory_compliance_to_inspections.sql
--
-- Value semantics (INTEGER stored as 0/1/NULL):
--   1    — storage_correct AND light_color_correct AND area_clean are all true
--   0    — at least one pre-scan check failed
--   NULL — pre-scan data was not collected (AI-only inspection)
--
-- The column is added with no NOT NULL constraint so existing rows keep NULL
-- until re-synced or overwritten by the sync service.
-- =============================================================================

ALTER TABLE pending_scans
  ADD COLUMN regulatory_compliance INTEGER;  -- 0=false, 1=true, NULL=no pre-scan

-- Record this migration.
INSERT OR IGNORE INTO schema_migrations (version, description, applied_at)
VALUES (
    6,
    'Add regulatory_compliance column to pending_scans',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

-- Bump the tracked schema version in sync_metadata.
INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
VALUES (
    'db_schema_version',
    '6',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
