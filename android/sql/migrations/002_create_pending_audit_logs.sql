-- =============================================================================
-- Migration 002: Create pending_audit_logs table
-- =============================================================================
-- Mirrors the IndexedDB store "pending-audit-logs" in meatlens-audit-offline
-- (offlineAuditQueue.ts). Each row is one audit / event-tracking entry that
-- was generated while offline and needs to be forwarded to the backend's
-- audit log endpoint once connectivity is restored.
--
-- Supabase note: Local only. The backend (POST /api/audit-logs or equivalent)
-- writes rows into Supabase's audit_logs table. No Supabase credentials needed.
-- =============================================================================

CREATE TABLE IF NOT EXISTS pending_audit_logs (
    -- Primary key — matches PendingAuditLog.id (UUID assigned at queue time).
    id                  TEXT    NOT NULL PRIMARY KEY,

    -- Owning user.
    user_id             TEXT    NOT NULL,

    -- Event descriptor — e.g. 'inspection_created', 'login_success', 'logout'.
    event_type          TEXT    NOT NULL,

    -- When the event actually occurred (ISO-8601).
    event_time          TEXT    NOT NULL,

    -- Arbitrary event payload stored as a JSON object string.
    -- Mirrors PendingAuditLog.data (Record<string, unknown>).
    data_json           TEXT,

    -- Source context — device info, app version, etc.
    -- Mirrors PendingAuditLog.source (Record<string, unknown>).
    source_json         TEXT,

    -- When this record was added to the queue (ISO-8601).
    queued_at           TEXT    NOT NULL,

    -- -------------------------------------------------------------------------
    -- Sync tracking (same semantics as pending_scans).
    -- -------------------------------------------------------------------------
    sync_status         TEXT    NOT NULL DEFAULT 'pending',
                                        -- 'pending' | 'syncing' | 'synced' | 'failed'
    sync_attempts       INTEGER NOT NULL DEFAULT 0,
    last_synced_at      TEXT,
    last_sync_error     TEXT,

    created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Index for the sync service: oldest pending events first.
CREATE INDEX IF NOT EXISTS idx_pending_audit_logs_sync_status_queued_at
    ON pending_audit_logs (sync_status, queued_at ASC);

-- Index for per-user queries.
CREATE INDEX IF NOT EXISTS idx_pending_audit_logs_user_id
    ON pending_audit_logs (user_id);

-- Index for event-type queries (e.g. counting pending login events).
CREATE INDEX IF NOT EXISTS idx_pending_audit_logs_event_type
    ON pending_audit_logs (event_type);

-- Trigger: keep updated_at current on every UPDATE.
CREATE TRIGGER IF NOT EXISTS trg_pending_audit_logs_updated_at
    AFTER UPDATE ON pending_audit_logs
    FOR EACH ROW
BEGIN
    UPDATE pending_audit_logs
       SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = NEW.id;
END;

-- Record this migration.
INSERT OR IGNORE INTO schema_migrations (version, description, applied_at)
VALUES (
    2,
    'Create pending_audit_logs table for offline audit event queue',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
