-- =============================================================================
-- Migration 003: Create offline_auth_envelope table
-- =============================================================================
-- Mirrors the IndexedDB store "auth-envelope" in meatlens-offline-auth
-- (offlineAuthEnvelope.ts). Stores the single "current" auth envelope that
-- allows the app to authenticate locally when the Supabase backend is
-- unreachable. Only one row should ever exist (envelope_key = 'current').
--
-- Supabase note: This table caches auth state that was obtained FROM Supabase
-- while online. It does NOT replace Supabase auth — it allows the app to
-- resume a session offline. When connectivity returns, the auth flow goes back
-- through the backend → Supabase as normal.
-- =============================================================================

CREATE TABLE IF NOT EXISTS offline_auth_envelope (
    -- Always 'current' — single-row table pattern (same as IndexedDB key).
    envelope_key                TEXT    NOT NULL PRIMARY KEY DEFAULT 'current',

    -- Serialised AuthUser object (from AuthClient.ts).
    user_json                   TEXT    NOT NULL,

    -- Serialised Profile object (from ProfileClient.ts).
    profile_json                TEXT    NOT NULL,

    -- JSON array of AuthRole strings: e.g. '["developer"]'.
    roles_json                  TEXT    NOT NULL DEFAULT '[]',

    -- Primary role string: 'developer' | 'admin' | 'inspector'.
    primary_role                TEXT    NOT NULL DEFAULT 'inspector',

    -- Boolean flags stored as integers (0 = false, 1 = true).
    is_admin                    INTEGER NOT NULL DEFAULT 0,
    is_developer                INTEGER NOT NULL DEFAULT 0,

    -- ISO-8601 timestamp of the last online authentication.
    authenticated_at            TEXT    NOT NULL,

    -- ISO-8601 timestamp after which this offline session must be refreshed.
    offline_expires_at          TEXT    NOT NULL,

    -- Whether the user must re-enter their credentials before offline use.
    offline_unlock_required     INTEGER NOT NULL DEFAULT 0,

    -- Serialised PasswordVerifierRecord or NULL (from offlineCredentials.ts).
    -- Stores the PBKDF2 hash for offline PIN/password verification.
    -- NOTE: This is a one-way verifier hash, NOT the user's plaintext password.
    password_verifier_json      TEXT,

    -- Serialised StoredLocalPasskey or NULL (from passkeys/localUnlock).
    local_passkey_json          TEXT,

    -- Housekeeping.
    updated_at                  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    created_at                  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Index to find expired envelopes quickly (used by the offline auth guard).
CREATE INDEX IF NOT EXISTS idx_offline_auth_envelope_offline_expires_at
    ON offline_auth_envelope (offline_expires_at);

-- Trigger: keep updated_at current on every UPDATE.
CREATE TRIGGER IF NOT EXISTS trg_offline_auth_envelope_updated_at
    AFTER UPDATE ON offline_auth_envelope
    FOR EACH ROW
BEGIN
    UPDATE offline_auth_envelope
       SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE envelope_key = NEW.envelope_key;
END;

-- Record this migration.
INSERT OR IGNORE INTO schema_migrations (version, description, applied_at)
VALUES (
    3,
    'Create offline_auth_envelope table for offline session persistence',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
