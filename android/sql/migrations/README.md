# SQLite Migrations — BotchaBuster / MeatLens (Android)

> **Location**: `android/sql/migrations/`  
> **Plugin**: [`@capacitor-community/sqlite`](https://github.com/capacitor-community/sqlite) (recommended)  
> **Platform**: Android native SQLite via Capacitor WebView bridge

---

## Overview

MeatLens already uses browser **IndexedDB** for offline persistence in the web/PWA
layer. These SQL migrations provide an equivalent **SQLite** schema for the
Android native layer, giving data that survives:

- WebView cache clears
- Android low-memory process kills
- App reinstalls (if using external storage or backup rules)

The Supabase backend connection is **completely unchanged** — the frontend still
talks to the Express backend at `meatlens-backend.onrender.com/api`, which talks to
Supabase. SQLite is purely an additive local cache/queue layer.

---

## Migration Files

Run migrations in this exact order:

| Order | File | Purpose |
|-------|------|---------|
| **1st** | `005_create_sync_metadata.sql` | Bootstrap: creates `schema_migrations` and `sync_metadata` tables. **Must run first.** |
| 2nd | `001_create_pending_scans.sql` | Offline scan queue |
| 3rd | `002_create_pending_audit_logs.sql` | Offline audit log queue |
| 4th | `003_create_offline_auth_envelope.sql` | Offline session / auth cache |
| 5th | `004_create_inspection_history_cache.sql` | Inspection list + stats cache |

> **Why 005 first?** Migrations 001–004 each do an `INSERT INTO schema_migrations`
> to self-register. The `schema_migrations` table must exist before they run.

---

## Table → IndexedDB Mapping

| SQLite Table | IndexedDB DB Name | IndexedDB Store | TypeScript Source |
|---|---|---|---|
| `pending_scans` | `meatlens-offline` | `pending-scans` | `lib/offlineQueue.ts` |
| `pending_audit_logs` | `meatlens-audit-offline` | `pending-audit-logs` | `lib/offlineAuditQueue.ts` |
| `offline_auth_envelope` | `meatlens-offline-auth` | `auth-envelope` | `lib/offlineAuthEnvelope.ts` |
| `inspection_history_cache` | `meatlens-inspection-history` | `inspection-lists` | `lib/inspectionHistoryCache.ts` |
| `inspection_stats_cache` | `meatlens-inspection-history` | `inspection-stats` | `lib/inspectionHistoryCache.ts` |
| `schema_migrations` | *(new)* | *(new)* | *(new)* |
| `sync_metadata` | *(new)* | *(new)* | *(new)* |

---

## Sync Flow

```
┌─────────────┐   offline write   ┌──────────────────┐
│  App (UI)   │ ─────────────────▶│  SQLite (local)  │
│             │                   │  pending_scans   │
│             │   online, reconnect│  pending_audit.. │
│             │ ◀──────────────── │                  │
└─────────────┘                   └────────┬─────────┘
                                           │  sync service
                                           │  reads rows where
                                           │  sync_status = 'pending'
                                           ▼
                              ┌────────────────────────┐
                              │  Backend Express API   │
                              │  meatlens-backend      │
                              │  .onrender.com/api     │
                              └───────────┬────────────┘
                                          │
                                          ▼
                              ┌────────────────────────┐
                              │       Supabase         │
                              │  (unchanged – remote)  │
                              └────────────────────────┘
```

### Sync Status States

| Status | Meaning |
|--------|---------|
| `pending` | Queued locally, not yet sent |
| `syncing` | Currently being uploaded (prevents double-submission) |
| `synced` | Successfully acknowledged by the backend |
| `failed` | Upload failed; will retry up to `sync_attempts` threshold |

---

## Supabase Connectivity — What Stays the Same

- **No Supabase JS client is used in the frontend.** All Supabase access goes
  through the Express backend (`VITE_API_BASE_URL`).
- **Auth tokens** come from the existing session cache (`authCache.ts` →
  `meatlens-auth-session` in `sessionStorage`). The offline auth envelope in
  SQLite mirrors this for native persistence only.
- **Online path is untouched.** When `@capacitor/network` reports the device is
  online, all API calls use the normal fetch-based clients (`InspectionClient`,
  `AuthClient`, etc.). SQLite is only consulted when offline.

---

## Setting up `@capacitor-community/sqlite`

### 1. Install the plugin

```bash
npm install @capacitor-community/sqlite
npx cap sync android
```

### 2. Initialize the database (TypeScript)

```typescript
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const sqlite = new SQLiteConnection(CapacitorSQLite);

async function openMeatLensDb() {
  if (Capacitor.getPlatform() !== 'android') return null;

  const db = await sqlite.createConnection(
    'meatlens',   // database name
    false,        // encrypted
    'no-encryption',
    1,            // version — bump when adding migrations
    false         // read-only
  );
  await db.open();
  return db;
}
```

### 3. Run migrations on app startup

```typescript
import migrationSql from './migrations'; // load SQL files as strings

async function runMigrations(db: SQLiteDBConnection) {
  // Always run 005 first (idempotent due to IF NOT EXISTS).
  await db.execute(migration005);

  const { values } = await db.query(
    'SELECT version FROM schema_migrations ORDER BY version ASC'
  );
  const applied = new Set(values?.map((r) => r.version) ?? []);

  const pending = [migration001, migration002, migration003, migration004]
    .filter((_, i) => !applied.has(i + 1));

  for (const sql of pending) {
    await db.execute(sql);
  }
}
```

### 4. Android permissions (already granted by Capacitor)

No additional `AndroidManifest.xml` changes are required — SQLite uses the app's
internal storage by default.

---

## JSON Column Conventions

Complex TypeScript objects are serialised with `JSON.stringify()` before storage
and deserialised with `JSON.parse()` on read. This matches the existing
IndexedDB pattern and avoids schema churn when object shapes evolve.

| Column | Type stored | Example |
|--------|-------------|---------|
| `analysis_result_json` | `AnalysisResult \| null` | `{"classification":"fresh","confidence_score":0.92,...}` |
| `data_json` / `source_json` | `Record<string, unknown>` | `{"device":"Pixel 9","appVersion":"1.0.0"}` |
| `user_json` | `AuthUser` | `{"id":"uuid","email":"user@example.com",...}` |
| `profile_json` | `Profile` | `{"id":"uuid","full_name":"Juan dela Cruz",...}` |
| `roles_json` | `AuthRole[]` | `["inspector"]` |
| `inspections_json` | `Inspection[]` | `[{"id":"uuid","meat_type":"pork",...}]` |
| `stats_json` | `InspectionHistoryStats` | `{"total":42,"byClassification":{"fresh":30,...}}` |
| `password_verifier_json` | `PasswordVerifierRecord \| null` | `{"email":"u@e.com","hash":"...","algorithm":"pbkdf2-sha256","iterations":100000}` |
| `local_passkey_json` | `StoredLocalPasskey \| null` | `{"credentialId":"...","publicKey":"..."}` |

---

## Security Notes

- **`password_verifier_json`** stores a PBKDF2-SHA256 one-way hash (100,000
  iterations), NOT the plaintext password. This is the same verifier used by
  `offlineCredentials.ts`.
- **`local_passkey_json`** stores the WebAuthn credential descriptor for the
  offline passkey unlock flow. Private key material lives in the Android
  Keystore — not in SQLite.
- Consider enabling **SQLCipher encryption** via `@capacitor-community/sqlite`'s
  `encrypted: true` option for production builds that store sensitive PII.

---

## Adding Future Migrations

1. Create `006_your_description.sql` following the same patterns.
2. Add `INSERT INTO schema_migrations (version, description, applied_at)` at the end.
3. Bump the `db_schema_version` value in `sync_metadata` via your migration runner.
4. Update this README's migration table.
