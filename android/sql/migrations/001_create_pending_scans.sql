-- =============================================================================
-- Migration 001: Create pending_scans table
-- =============================================================================
-- Mirrors the IndexedDB store "pending-scans" in meatlens-offline (offlineQueue.ts).
-- Each row represents one meat inspection capture queued while the device was
-- offline. When connectivity is restored the sync service reads rows where
-- sync_status = 'pending', replays them to the backend, and marks them 'synced'.
--
-- Supabase note: This table is LOCAL ONLY. Synced records are forwarded to the
-- backend (meatlens-backend.onrender.com/api/inspections) which then persists
-- them in Supabase. No Supabase credentials are stored or used here.
-- =============================================================================

CREATE TABLE IF NOT EXISTS pending_scans (
    -- Primary key — same UUID written as client_submission_id on the server.
    id                                  TEXT        NOT NULL PRIMARY KEY,

    -- Raw image payload captured offline.
    image_data                          BLOB        NOT NULL,
    image_type                          TEXT        NOT NULL,   -- e.g. "image/jpeg"
    image_name                          TEXT        NOT NULL,

    -- Inspection metadata.
    meat_type                           TEXT        NOT NULL,   -- 'pork'|'beef'|'chicken'|'fish'|'other'
    location                            TEXT,
    location_latitude                   REAL,
    location_longitude                  REAL,
    stall_number                        TEXT,
    meat_inspection_certificate_proof   TEXT,
    meat_expiry_date                    TEXT,

    -- Protocol pre-scan boolean flags (stored as 0/1; NULL = not answered).
    storage_correct                     INTEGER,                -- 0=false, 1=true, NULL=unanswered
    light_color_correct                 INTEGER,
    light_color_observed                TEXT,
    area_clean                          INTEGER,

    -- Decision routing.
    inspection_decision_source          TEXT        NOT NULL,   -- 'ai'|'protocol_pre_scan'
    protocol_spoiled_reason             TEXT,

    -- Timestamps (ISO-8601 strings to match TypeScript Date.toISOString()).
    captured_at                         TEXT,
    queued_at                           TEXT        NOT NULL,

    -- Owning user.
    user_id                             TEXT        NOT NULL,

    -- If analysis already completed before the network dropped, store the
    -- full AnalysisResult as a JSON string so the sync step can skip re-analysis.
    -- NULL means the full analyze → upload → save chain is still pending.
    analysis_result_json                TEXT,

    -- -------------------------------------------------------------------------
    -- Sync tracking columns (not present in the IndexedDB schema — added here
    -- to give the SQLite sync service idempotent retry semantics).
    -- -------------------------------------------------------------------------
    sync_status                         TEXT        NOT NULL DEFAULT 'pending',
                                                    -- 'pending' | 'syncing' | 'synced' | 'failed'
    sync_attempts                       INTEGER     NOT NULL DEFAULT 0,
    last_synced_at                      TEXT,
    last_sync_error                     TEXT,

    -- Optimistic-lock / dirty tracking.
    created_at                          TEXT        NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at                          TEXT        NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Index for the sync service: fetch all rows that need uploading, oldest first.
CREATE INDEX IF NOT EXISTS idx_pending_scans_sync_status_queued_at
    ON pending_scans (sync_status, queued_at ASC);

-- Index for per-user queries (e.g. offline history view).
CREATE INDEX IF NOT EXISTS idx_pending_scans_user_id
    ON pending_scans (user_id);

-- Trigger: keep updated_at current on every UPDATE.
CREATE TRIGGER IF NOT EXISTS trg_pending_scans_updated_at
    AFTER UPDATE ON pending_scans
    FOR EACH ROW
BEGIN
    UPDATE pending_scans
       SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = NEW.id;
END;

-- Record this migration.
INSERT OR IGNORE INTO schema_migrations (version, description, applied_at)
VALUES (
    1,
    'Create pending_scans table for offline scan queue',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
