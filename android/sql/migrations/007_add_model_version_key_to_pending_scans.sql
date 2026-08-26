-- Preserve the deployment identity of an offline analysis until it syncs.
ALTER TABLE pending_scans
  ADD COLUMN model_version_key TEXT;

INSERT OR IGNORE INTO schema_migrations (version, description, applied_at)
VALUES (
  7,
  'Add model version key to pending scans',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
VALUES (
  'db_schema_version',
  '7',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
