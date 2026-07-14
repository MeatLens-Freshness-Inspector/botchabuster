-- =============================================================================
-- Migration 004: Create inspection history cache tables
-- =============================================================================
-- Mirrors the two IndexedDB stores in meatlens-inspection-history
-- (inspectionHistoryCache.ts):
--
--   "inspection-lists"  → inspection_history_cache
--   "inspection-stats"  → inspection_stats_cache
--
-- These tables act as a read-through cache of the server's inspection data.
-- When the device is online, the app fetches from the backend (Supabase data)
-- and writes to these tables. When offline, the app reads from here instead.
--
-- Supabase note: Read-only mirror of Supabase data fetched via the backend.
-- No writes originate from this cache back to Supabase — only reads.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 4a. Inspection list cache
-- Key pattern: '{userId}:{scope}'  where scope is 'mine' or 'all'
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspection_history_cache (
    -- Composite cache key matching buildCacheKey() in TypeScript.
    cache_key           TEXT    NOT NULL PRIMARY KEY,

    -- De-normalised for easy per-user queries without parsing the key.
    user_id             TEXT    NOT NULL,

    -- Scope of the cached list.
    scope               TEXT    NOT NULL DEFAULT 'mine',  -- 'mine' | 'all'

    -- Full JSON array of Inspection objects serialised with JSON.stringify().
    -- Mirrors CachedInspectionListRecord.inspections.
    inspections_json    TEXT    NOT NULL DEFAULT '[]',

    -- ISO-8601 timestamp of the last successful fetch from the backend.
    updated_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    -- Optional: staleness TTL helper (epoch seconds). NULL = never expire.
    -- The app layer compares (unixepoch('now') - fetched_at_unix) against a
    -- configured max-age before deciding to re-fetch or serve from cache.
    fetched_at_unix     INTEGER,

    created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Index for per-user lookups across both scopes.
CREATE INDEX IF NOT EXISTS idx_inspection_history_cache_user_id
    ON inspection_history_cache (user_id);

-- Index to find stale cache entries (staleness sweeper).
CREATE INDEX IF NOT EXISTS idx_inspection_history_cache_fetched_at_unix
    ON inspection_history_cache (fetched_at_unix);

-- Trigger: keep updated_at current on every UPDATE.
CREATE TRIGGER IF NOT EXISTS trg_inspection_history_cache_updated_at
    AFTER UPDATE ON inspection_history_cache
    FOR EACH ROW
BEGIN
    UPDATE inspection_history_cache
       SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE cache_key = NEW.cache_key;
END;


-- ---------------------------------------------------------------------------
-- 4b. Inspection stats cache
-- Key pattern: '{userId}:{scope}'  (same as above)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspection_stats_cache (
    -- Composite cache key matching buildCacheKey() in TypeScript.
    cache_key           TEXT    NOT NULL PRIMARY KEY,

    user_id             TEXT    NOT NULL,

    scope               TEXT    NOT NULL DEFAULT 'mine',  -- 'mine' | 'all'

    -- Serialised InspectionHistoryStats object:
    -- { total: number, byClassification: Record<FreshnessClassification, number> }
    stats_json          TEXT    NOT NULL DEFAULT '{}',

    -- ISO-8601 timestamp of the last successful fetch.
    updated_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    fetched_at_unix     INTEGER,

    created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Index for per-user lookups.
CREATE INDEX IF NOT EXISTS idx_inspection_stats_cache_user_id
    ON inspection_stats_cache (user_id);

-- Trigger: keep updated_at current on every UPDATE.
CREATE TRIGGER IF NOT EXISTS trg_inspection_stats_cache_updated_at
    AFTER UPDATE ON inspection_stats_cache
    FOR EACH ROW
BEGIN
    UPDATE inspection_stats_cache
       SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE cache_key = NEW.cache_key;
END;


-- Record this migration.
INSERT OR IGNORE INTO schema_migrations (version, description, applied_at)
VALUES (
    4,
    'Create inspection_history_cache and inspection_stats_cache tables',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
