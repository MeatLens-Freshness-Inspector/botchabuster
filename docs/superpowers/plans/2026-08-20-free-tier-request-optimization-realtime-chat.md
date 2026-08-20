# Free-Tier Request Optimization and Realtime Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop repository-controlled idle traffic from keeping Render awake, reduce tracked-session cleanup to one Supabase request every 15 minutes, and replace six-second chat polling with bounded authenticated realtime delivery.

**Architecture:** The backend remains the security boundary. A visible Messages page opens an authenticated streaming `fetch` to an Express SSE endpoint; one process-wide hub lazily shares a service-role Supabase Realtime subscription and participant-filters inserts. Session cleanup remains an immediate-plus-periodic server job, but uses an independent 900-second cadence and a single combined delete.

**Tech Stack:** TypeScript, Node.js, Express, Supabase JS/Postgres Realtime, React, browser streaming `fetch`, Server-Sent Events, Node test runner, Playwright.

## Global Constraints

- Delete the repository GitHub keep-awake schedule, but retain `render.yaml`'s `/api/analysis/health` native health check.
- `SESSION_CLEANUP_INTERVAL_SECONDS` defaults to `900`, clamps to a minimum of `300`, and is not clamped to `SESSION_IDLE_TIMEOUT_SECONDS`.
- Global and per-user inactive-session pruning each use one Supabase DELETE whose predicate covers absolute expiry OR idle expiry.
- The browser never receives a Supabase URL, anon key, service key, or app-session token in a URL.
- Realtime is active only for an online-authenticated, mounted, visible Messages screen; hiding, unmounting, logout, or going offline aborts it.
- Opening, selecting, sending, focusing/reappearing, reconnecting, and manual refresh may cause bounded snapshots; no timed REST polling fallback is allowed.
- Both upstream and downstream retry delays are exactly `1_000`, `2_000`, `5_000`, `15_000`, and `30_000` milliseconds, then automatic retries stop.
- SSE heartbeat comments occur every `25_000` milliseconds and do not touch tracked-session activity.
- Rotate a stream at the earlier of app-token absolute expiration or one configured idle-timeout window from stream authentication.
- Limit live streams to two per user and 100 per backend instance; evict the oldest user stream when a third is accepted.
- Bound each stream queue to 100 events or 256 KiB; close an overflowing stream so snapshots recover it.
- Limit accepted user-chat sends to 30 per authenticated user per rolling minute, with no cleanup timer.
- Supabase Realtime publishes only inserts from `public.user_chat_messages`; delivery goes only to the authenticated sender and recipient.
- Implementation uses test-first RED/GREEN cycles and ends each task in a meaningful commit.

---

## File Structure

- `scripts/request-budget.test.mjs`: repository guardrails for keep-awake workflows, Render health configuration, and chat polling.
- `backend/src/modules/auth/infrastructure/SessionLimitService.ts`: one-query cleanup plus idle-aware per-user slot accounting.
- `backend/src/modules/chat/infrastructure/ChatRealtimeHub.ts`: shared upstream subscription, participant fan-out, connection limits, bounded recovery.
- `backend/src/modules/chat/infrastructure/BufferedSseConnection.ts`: bounded response queue and drain handling.
- `backend/src/modules/chat/infrastructure/SupabaseChatRealtimeSource.ts`: adapter from Supabase channel callbacks to typed chat inserts.
- `backend/src/modules/chat/presentation/controllers/ChatEventsController.ts`: authentication, origin validation, SSE headers, heartbeat, rotation, cleanup.
- `backend/src/modules/chat/presentation/user-chat-send-rate-limit.ts`: user-keyed 30/minute request-driven limiter.
- `frontend/src/entities/message/api/message-event-stream.ts`: authenticated streaming fetch and SSE frame parser.
- `frontend/src/features/messaging/model/message-state.ts`: deterministic ID-based message/contact reconciliation.
- `frontend/src/features/messaging/model/use-message-stream.ts`: visible/online stream lifecycle and bounded reconnection.
- `frontend/src/features/messaging/model/use-messages.ts`: snapshot coordination and integration without polling.

---

### Task 1: Prevent repository-controlled Render keep-awake traffic

**Files:**
- Create: `scripts/request-budget.test.mjs`
- Delete: `.github/workflows/keep-awake.yml`
- Verify: `render.yaml`

**Interfaces:**
- Consumes: repository files only.
- Produces: a root `test:scripts` guard that fails if scheduled workflows ping the production Render URL or if the native health path disappears. Task 14 extends the same guard with the no-polling assertion once polling has been removed.

- [ ] **Step 1: Write the failing guard test**

```js
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("scheduled workflows do not ping the production Render service", async () => {
  const directory = path.join(root, ".github", "workflows");
  const names = (await readdir(directory)).filter((name) => /\.ya?ml$/i.test(name));
  const workflows = await Promise.all(names.map((name) => read(path.join(".github", "workflows", name))));
  const scheduled = workflows.filter((source) => /^\s*schedule\s*:/m.test(source));
  assert.ok(scheduled.length > 0, "expected the daily CI schedule to remain covered");
  for (const source of scheduled) {
    assert.doesNotMatch(source, /meatlens-backend\.onrender\.com/i);
  }
});

test("Render retains its native lightweight health check", async () => {
  assert.match(await read("render.yaml"), /healthCheckPath:\s*\/api\/analysis\/health/);
});

```

- [ ] **Step 2: Run the guard and verify RED**

Run: `npm.cmd run test:scripts`

Expected: FAIL because `keep-awake.yml` contains the production Render URL.

- [ ] **Step 3: Remove the scheduled keep-awake workflow**

Delete `.github/workflows/keep-awake.yml`; keep `render.yaml` unchanged.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd run test:scripts`

Expected: PASS; `render.yaml` remains unchanged.

- [ ] **Step 5: Commit**

```powershell
git add scripts/request-budget.test.mjs .github/workflows/keep-awake.yml
git commit -m "perf(infra): let idle Render service spin down"
```

### Task 2: Lower and decouple the session-cleanup cadence

**Files:**
- Modify: `backend/tests/unit/config/app-config.unit.test.ts`
- Modify: `backend/src/config/app.config.ts`
- Modify: `documentation/DEPLOYMENT.md`
- Modify: `documentation/SECURITY.md`

**Interfaces:**
- Produces: `resolveSessionTiming(overrides).sessionCleanupIntervalMs` with a 900,000 ms default and 300,000 ms floor.

- [ ] **Step 1: Write RED assertions**

```ts
assert.equal(resolveSessionTiming({}).sessionCleanupIntervalMs, 900_000);
assert.equal(
  resolveSessionTiming({ SESSION_CLEANUP_INTERVAL_SECONDS: "30" }).sessionCleanupIntervalMs,
  300_000,
);
assert.equal(
  resolveSessionTiming({
    SESSION_IDLE_TIMEOUT_SECONDS: "60",
    SESSION_CLEANUP_INTERVAL_SECONDS: "1200",
  }).sessionCleanupIntervalMs,
  1_200_000,
);
```

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/config/app-config.unit.test.ts`

Expected: FAIL at the old 60,000 ms default, one-second floor, and idle-timeout clamp.

- [ ] **Step 3: Implement the independent cadence**

```ts
const cleanupIntervalSeconds = parseMinimumInteger(
  overrides.SESSION_CLEANUP_INTERVAL_SECONDS,
  900,
  300,
);

return {
  sessionIdleTimeoutSeconds,
  sessionCleanupIntervalMs: cleanupIntervalSeconds * 1000,
};
```

Document `900`, the 300-second floor, and that physical deletion may lag idle authorization without extending it.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/config/app-config.unit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/tests/unit/config/app-config.unit.test.ts backend/src/config/app.config.ts documentation/DEPLOYMENT.md documentation/SECURITY.md
git commit -m "perf(auth): lower session cleanup cadence"
```

### Task 3: Collapse global cleanup into one Supabase delete

**Files:**
- Create: `backend/tests/unit/auth/session-limit-service-db.unit.test.ts`
- Modify: `backend/src/modules/auth/infrastructure/SessionLimitService.ts`

**Interfaces:**
- Preserves: `removeInactiveSessions(idleTimeoutSeconds: number): Promise<number>`.

- [ ] **Step 1: Write a RED database-adapter test**

Create a chain fake recording `deleteOptions`, `orFilters`, and `deleteCalls`; return `{ count: 7, error: null }` from `.or()`. Assert:

```ts
assert.equal(deleteCalls, 1);
assert.deepEqual(deleteOptions, [{ count: "exact" }]);
assert.equal(orFilters.length, 1);
assert.match(orFilters[0], /^expires_at\.lte\..+,last_seen_at\.lte\..+$/);
assert.equal(await service.removeInactiveSessions(900), 7);
```

Restore the monkey-patched `supabase.from` in `finally`.

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/auth/session-limit-service-db.unit.test.ts`

Expected: FAIL because the current service makes two deletes and selects IDs.

- [ ] **Step 3: Implement one combined delete**

```ts
const now = new Date();
const idleCutoff = new Date(now.getTime() - idleTimeoutSeconds * 1000);
const { count, error } = await supabase
  .from("user_sessions")
  .delete({ count: "exact" })
  .or(`expires_at.lte.${now.toISOString()},last_seen_at.lte.${idleCutoff.toISOString()}`);

if (error) throw new Error(`Failed to remove inactive sessions: ${error.message}`);
return count ?? 0;
```

- [ ] **Step 4: Verify GREEN and scheduler compatibility**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/auth/session-limit-service-db.unit.test.ts tests/unit/auth/session-cleanup-service.unit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/tests/unit/auth/session-limit-service-db.unit.test.ts backend/src/modules/auth/infrastructure/SessionLimitService.ts
git commit -m "perf(auth): combine session cleanup delete"
```

### Task 4: Make sign-in device slots idle-aware

**Files:**
- Modify: `backend/tests/unit/auth/session-limit-service.unit.test.ts`
- Modify: `backend/tests/unit/auth/module-session-limit-service.unit.test.ts`
- Modify: `backend/tests/unit/auth/session-limit-service-db.unit.test.ts`
- Modify: `backend/tests/integration/auth/cookie-session.integration.test.ts`
- Modify: `tests/contracts/api-contract.test.ts`
- Modify: `backend/src/modules/auth/infrastructure/SessionLimitService.ts`
- Modify: `backend/src/modules/auth/presentation/controllers/AuthController.ts`

**Interfaces:**
- Produces: `pruneInactiveSessions(userId: string, idleTimeoutSeconds: number): Promise<void>`.
- Changes: `countActiveSessions(userId: string, idleTimeoutSeconds: number): Promise<number>` and `isAtLimit(userId: string, idleTimeoutSeconds: number): Promise<boolean>`.

- [ ] **Step 1: Write RED service and controller assertions**

Test that an unexpired row whose `last_seen_at` exceeds the idle window is pruned/excluded, another user's row is retained, and sign-in invokes:

```ts
assert.deepEqual(pruneCalls, [[user.id, 900]]);
assert.deepEqual(limitCalls, [[user.id, 900]]);
```

For the DB fake assert a single user-scoped prune has `.eq("user_id", userId)` followed by the expired-or-idle `.or(...)`, while count has both `.gt("expires_at", now)` and `.gt("last_seen_at", cutoff)`.

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/auth/session-limit-service.unit.test.ts tests/unit/auth/module-session-limit-service.unit.test.ts tests/unit/auth/session-limit-service-db.unit.test.ts tests/integration/auth/cookie-session.integration.test.ts`

Expected: FAIL because per-user pruning/counting currently considers only absolute expiry.

- [ ] **Step 3: Implement idle-aware slot accounting**

```ts
await query
  .delete()
  .eq("user_id", userId)
  .or(`expires_at.lte.${nowIso},last_seen_at.lte.${idleCutoffIso}`);

const { count } = await query
  .select("id", { count: "exact", head: true })
  .eq("user_id", userId)
  .gt("expires_at", nowIso)
  .gt("last_seen_at", idleCutoffIso);
```

In `AuthController.reserveSessionSlot`, pass `this.config.sessionIdleTimeoutSeconds` to both prune and limit checks.

- [ ] **Step 4: Verify GREEN and contract compatibility**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/auth/session-limit-service.unit.test.ts tests/unit/auth/module-session-limit-service.unit.test.ts tests/unit/auth/session-limit-service-db.unit.test.ts tests/integration/auth/cookie-session.integration.test.ts; npm.cmd run test:contract`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/tests/unit/auth backend/tests/integration/auth/cookie-session.integration.test.ts backend/src/modules/auth/infrastructure/SessionLimitService.ts backend/src/modules/auth/presentation/controllers/AuthController.ts tests/contracts/api-contract.test.ts
git commit -m "fix(auth): release idle device slots during sign-in"
```

### Task 5: Publish chat inserts to Supabase Realtime

**Files:**
- Create: `backend/supabase/migrations/20260820010000_enable_user_chat_realtime.sql`
- Create: `backend/tests/unit/infrastructure/chat-realtime-migration.unit.test.ts`

**Interfaces:**
- Produces: idempotent membership of `public.user_chat_messages` in `supabase_realtime`; does not change browser grants/RLS.

- [ ] **Step 1: Write the RED migration source test**

```ts
const source = await readFile(migrationPath, "utf8");
assert.match(source, /pg_publication_tables/);
assert.match(source, /alter publication supabase_realtime add table public\.user_chat_messages/i);
assert.doesNotMatch(source, /grant\s+.*anon|grant\s+.*authenticated/i);
```

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/infrastructure/chat-realtime-migration.unit.test.ts`

Expected: FAIL because the migration file does not exist.

- [ ] **Step 3: Add the idempotent migration**

```sql
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_chat_messages'
  ) then
    alter publication supabase_realtime add table public.user_chat_messages;
  end if;
end
$$;
```

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/infrastructure/chat-realtime-migration.unit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/supabase/migrations/20260820010000_enable_user_chat_realtime.sql backend/tests/unit/infrastructure/chat-realtime-migration.unit.test.ts
git commit -m "feat(chat): publish message inserts to realtime"
```

### Task 6: Add participant-scoped shared chat fan-out

**Files:**
- Create: `backend/src/modules/chat/infrastructure/ChatRealtimeHub.ts`
- Create: `backend/tests/unit/chat/chat-realtime-hub.unit.test.ts`

**Interfaces:**
- Consumes: `UserChatMessage`.
- Produces: `ChatRealtimeSource.start(onInsert, onDisconnect): Promise<StopRealtimeSource>`, `ChatStreamClient`, and `ChatRealtimeHub.connect(client): Promise<() => void>`.

- [ ] **Step 1: Write RED hub tests**

Use a fake source with explicit `emit(message)` and counters. Assert that two connects start it once; a message reaches only clients whose user IDs equal `sender_id` or `recipient_id`; disconnecting one retains the source; disconnecting the last invokes stop exactly once.

```ts
await hub.connect(senderClient);
const disconnectRecipient = await hub.connect(recipientClient);
await hub.connect(unrelatedClient);
source.emit(message);
assert.deepEqual(senderClient.events, [message]);
assert.deepEqual(recipientClient.events, [message]);
assert.deepEqual(unrelatedClient.events, []);
await disconnectRecipient();
```

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/chat/chat-realtime-hub.unit.test.ts`

Expected: FAIL because `ChatRealtimeHub` does not exist.

- [ ] **Step 3: Implement lazy shared fan-out**

Define exact contracts:

```ts
export type StopRealtimeSource = () => Promise<void> | void;
export interface ChatRealtimeSource {
  start(
    onInsert: (message: UserChatMessage) => void,
    onDisconnect: (error: Error) => void,
  ): Promise<StopRealtimeSource>;
}
export interface ChatStreamClient {
  id: string;
  userId: string;
  createdAt: number;
  send(event: "message" | "status", data: unknown): boolean;
  close(reason: string): void;
}
```

Store clients in `Map<string, ChatStreamClient>`, keep one `startPromise`, filter every insert by the server-owned `userId`, and stop/reset the source after the final disconnect. A resolved source start marks clients connected; an initial rejection or later `onDisconnect` callback is delegated to Task 7's retry state machine.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/chat/chat-realtime-hub.unit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/modules/chat/infrastructure/ChatRealtimeHub.ts backend/tests/unit/chat/chat-realtime-hub.unit.test.ts
git commit -m "feat(chat): share participant-scoped realtime fanout"
```

### Task 7: Bound hub connections, buffering, and upstream recovery

**Files:**
- Create: `backend/src/modules/chat/infrastructure/BufferedSseConnection.ts`
- Create: `backend/tests/unit/chat/buffered-sse-connection.unit.test.ts`
- Modify: `backend/src/modules/chat/infrastructure/ChatRealtimeHub.ts`
- Modify: `backend/tests/unit/chat/chat-realtime-hub.unit.test.ts`

**Interfaces:**
- Produces: `BufferedSseConnection` implementing `ChatStreamClient` with `maxEvents=100`, `maxBytes=262_144`.
- Extends: `ChatRealtimeHub` options `{ maxClients: 100, maxClientsPerUser: 2, retryDelaysMs: [1000,2000,5000,15000,30000] }` and exports `ChatConnectionLimitError` for a pre-header 429 response.

- [ ] **Step 1: Write RED limit/retry/backpressure tests**

Assert: client 101 is rejected; a third same-user client closes the oldest; a writer returning `false` queues frames until `drain`; queue event/byte overflow closes and clears; concurrent source failures schedule only `[1000,2000,5000,15000,30000]`; the sixth failure emits `status: { state: "realtime_unavailable" }` and schedules nothing.

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/chat/chat-realtime-hub.unit.test.ts tests/unit/chat/buffered-sse-connection.unit.test.ts`

Expected: FAIL because limits, queueing, and bounded recovery are absent.

- [ ] **Step 3: Implement exact bounds**

```ts
export const CHAT_RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 15_000, 30_000] as const;
export const MAX_CHAT_STREAMS = 100;
export const MAX_CHAT_STREAMS_PER_USER = 2;
export const MAX_CHAT_QUEUE_EVENTS = 100;
export const MAX_CHAT_QUEUE_BYTES = 256 * 1024;
```

Serialize source starts through one promise. Reset retry count on `connected`. After the fifth scheduled retry fails, notify clients once and wait for a fresh `connect`/manual reconnect. Make `shutdown()` cancel retry timers, stop upstream, close clients, and clear all references.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/chat/chat-realtime-hub.unit.test.ts tests/unit/chat/buffered-sse-connection.unit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/modules/chat/infrastructure/ChatRealtimeHub.ts backend/src/modules/chat/infrastructure/BufferedSseConnection.ts backend/tests/unit/chat/chat-realtime-hub.unit.test.ts backend/tests/unit/chat/buffered-sse-connection.unit.test.ts
git commit -m "feat(chat): bound realtime resource recovery"
```

### Task 8: Adapt Supabase Realtime behind the hub port

**Files:**
- Create: `backend/src/modules/chat/infrastructure/SupabaseChatRealtimeSource.ts`
- Create: `backend/tests/unit/chat/supabase-chat-realtime-source.unit.test.ts`
- Modify: `backend/src/modules/chat/index.ts`

**Interfaces:**
- Implements: `ChatRealtimeSource` with one `postgres_changes` INSERT filter on `schema: "public", table: "user_chat_messages"`.
- Produces: `chatRealtimeHub` singleton for route/server composition.

- [ ] **Step 1: Write the RED adapter test**

With a fake client/channel, assert `.channel("user-chat-inserts")`, `.on("postgres_changes", { event: "INSERT", schema: "public", table: "user_chat_messages" }, callback)`, and one subscribe. Emit a payload and assert `payload.new` is forwarded only when all five string fields are valid. Invoke stop and assert `removeChannel(channel)` exactly once.

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/chat/supabase-chat-realtime-source.unit.test.ts`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement the adapter**

Resolve `start()` only when Supabase reports `SUBSCRIBED`. Before that point, reject it on `CHANNEL_ERROR`, `TIMED_OUT`, or `CLOSED`; after subscription, invoke `onDisconnect(new Error(status))` so the hub owns recovery. Validate `id`, `sender_id`, `recipient_id`, `content`, and `created_at` as strings before forwarding.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/chat/supabase-chat-realtime-source.unit.test.ts tests/unit/chat/chat-realtime-hub.unit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/modules/chat/infrastructure/SupabaseChatRealtimeSource.ts backend/tests/unit/chat/supabase-chat-realtime-source.unit.test.ts backend/src/modules/chat/index.ts
git commit -m "feat(chat): connect hub to Supabase realtime"
```

### Task 9: Expose a secure rotating SSE endpoint

**Files:**
- Create: `backend/src/modules/chat/presentation/controllers/ChatEventsController.ts`
- Create: `backend/tests/unit/chat/chat-events-controller.unit.test.ts`
- Modify: `backend/src/modules/chat/presentation/user-chat-routes.ts`
- Modify: `backend/tests/integration/security/server-hardening.integration.test.ts`

**Interfaces:**
- Produces: `GET /api/user-chat/events` using `resolveTrackedRequestAuthContext`, explicit origin allowlisting, heartbeat comments, and `BufferedSseConnection`.

- [ ] **Step 1: Write RED controller/security tests**

Assert unauthenticated requests return 401 before headers; a disallowed Origin returns 403; allowed cookie and bearer sessions get:

```ts
assert.equal(headers["content-type"], "text/event-stream; charset=utf-8");
assert.equal(headers["cache-control"], "no-cache, no-transform");
assert.equal(headers.connection, "keep-alive");
assert.equal(headers["x-accel-buffering"], "no");
```

With fake timers, assert `: heartbeat\n\n` at 25,000 ms and closure at `min(auth.expiresAt-now, idleTimeoutSeconds*1000)`. Assert request close removes the hub client and clears both timers. Assert heartbeat does not call session touching.

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/chat/chat-events-controller.unit.test.ts tests/integration/security/server-hardening.integration.test.ts`

Expected: FAIL because the endpoint/controller do not exist.

- [ ] **Step 3: Implement auth, origin, headers, rotation, and cleanup**

Use `isOriginAllowed(req.get("origin"), config.allowedOrigins)` before `flushHeaders()`. Generate the connection ID server-side with `randomUUID()`. Register one idempotent cleanup function on both `req.close` and `res.close`; it clears heartbeat/rotation timers and disconnects the hub client. Encode named frames as:

```ts
`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
```

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/chat/chat-events-controller.unit.test.ts tests/integration/security/server-hardening.integration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/modules/chat/presentation/controllers/ChatEventsController.ts backend/src/modules/chat/presentation/user-chat-routes.ts backend/tests/unit/chat/chat-events-controller.unit.test.ts backend/tests/integration/security/server-hardening.integration.test.ts
git commit -m "feat(chat): expose authenticated realtime events"
```

### Task 10: Bound sends and stop realtime cleanly

**Files:**
- Create: `backend/src/modules/chat/presentation/user-chat-send-rate-limit.ts`
- Create: `backend/tests/unit/chat/user-chat-send-rate-limit.unit.test.ts`
- Modify: `backend/src/modules/chat/presentation/controllers/UserChatController.ts`
- Modify: `backend/src/modules/chat/presentation/user-chat-routes.ts`
- Modify: `backend/src/server.ts`
- Modify: `backend/tests/unit/server.unit.test.ts`

**Interfaces:**
- Produces: request-driven `consumeUserChatSend(userId: string, now?: number): { allowed: boolean; retryAfterSeconds: number }` with 30 accepts per 60,000 ms and no interval.
- Consumes: `chatRealtimeHub.shutdown()`.

- [ ] **Step 1: Write RED limiter and shutdown tests**

Assert calls 1–30 for one user are allowed, 31 is denied with a positive retry delay, another user remains allowed, and the first user is allowed after 60,000 ms. Assert source contains no `setInterval`. For server close, inject/spy hub shutdown and assert it runs alongside cleanup stop.

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/chat/user-chat-send-rate-limit.unit.test.ts tests/unit/server.unit.test.ts`

Expected: FAIL because the limiter and shutdown hook do not exist.

- [ ] **Step 3: Implement auth-first send limiting and shutdown**

Resolve the actor once in `sendMessage`, then consume the actor-keyed bucket before executing the send. Return status 429, `Retry-After`, and `{ error: "Too many messages. Please wait before sending again." }`. Do not key successful authentication by IP. On server close call both `sessionCleanup.stop()` and `void chatRealtimeHub.shutdown()`.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd exec -w backend -- tsx --test tests/unit/chat/user-chat-send-rate-limit.unit.test.ts tests/unit/server.unit.test.ts tests/unit/chat`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/modules/chat/presentation backend/src/server.ts backend/tests/unit/chat/user-chat-send-rate-limit.unit.test.ts backend/tests/unit/server.unit.test.ts
git commit -m "feat(chat): limit sends and cleanly stop streams"
```

### Task 11: Parse authenticated message event streams in the frontend

**Files:**
- Create: `frontend/src/entities/message/api/message-event-stream.ts`
- Create: `frontend/tests/unit/entities/message/message-event-stream.unit.test.ts`
- Modify: `frontend/src/entities/message/index.ts`

**Interfaces:**
- Produces: `openMessageEventStream({ signal, onMessage, onStatus }): Promise<void>`.

- [ ] **Step 1: Write RED parser/client tests**

Use a `ReadableStream` whose chunks split UTF-8 and SSE delimiters. Assert authenticated headers, `Accept: text/event-stream`, parsing of `event: message` and `event: status`, ignored heartbeats/malformed rows, auth-expiry notification on 401, and completion/rejection on stream close/error.

```ts
await openMessageEventStream({
  signal: controller.signal,
  onMessage: (message) => received.push(message),
  onStatus: (status) => statuses.push(status),
});
assert.deepEqual(received, [expectedMessage]);
```

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd exec -w frontend -- tsx --test tests/unit/entities/message/message-event-stream.unit.test.ts`

Expected: FAIL because the stream module does not exist.

- [ ] **Step 3: Implement streaming fetch and incremental parsing**

Call `${API_BASE_URL}/user-chat/events` with `createAuthHeaders({ Accept: "text/event-stream" })` and the supplied abort signal; do not use `fetchWithTimeout`. Decode with `TextDecoder(..., { stream: true })`, retain incomplete frames between reads, split complete frames on blank lines, and validate the same five string message fields before `onMessage`.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd exec -w frontend -- tsx --test tests/unit/entities/message/message-event-stream.unit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/entities/message/api/message-event-stream.ts frontend/src/entities/message/index.ts frontend/tests/unit/entities/message/message-event-stream.unit.test.ts
git commit -m "feat(messages): add authenticated event stream client"
```

### Task 12: Reconcile message snapshots and realtime inserts deterministically

**Files:**
- Create: `frontend/src/features/messaging/model/message-state.ts`
- Create: `frontend/tests/unit/features/messaging/message-state.unit.test.ts`

**Interfaces:**
- Produces: `upsertMessages(current, incoming): UserChatMessage[]`, `applyMessageToContacts(contacts, message, currentUserId): UserChatContact[]`, and `isConversationMessage(message, currentUserId, counterpartyId): boolean`.

- [ ] **Step 1: Write RED state tests**

Assert duplicate IDs appear once; ordering uses `created_at` then `id`; late snapshots cannot erase a streamed insert when merged; sender/recipient matching selects the right conversation; preview content/time update and move the corresponding contact to index zero; unrelated contacts retain order.

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd exec -w frontend -- tsx --test tests/unit/features/messaging/message-state.unit.test.ts`

Expected: FAIL because state helpers do not exist.

- [ ] **Step 3: Implement pure reconciliation**

Use a `Map(message.id -> message)`, merge incoming after current, and sort with:

```ts
left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id)
```

For contacts, derive the counterparty as `message.sender_id === currentUserId ? message.recipient_id : message.sender_id`, update only that contact's preview/time, and stable-sort it ahead of older/null activity.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd exec -w frontend -- tsx --test tests/unit/features/messaging/message-state.unit.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/features/messaging/model/message-state.ts frontend/tests/unit/features/messaging/message-state.unit.test.ts
git commit -m "feat(messages): reconcile realtime message state"
```

### Task 13: Add visible-only bounded stream lifecycle

**Files:**
- Create: `frontend/src/features/messaging/model/use-message-stream.ts`
- Create: `frontend/tests/unit/features/messaging/use-message-stream.unit.test.tsx`

**Interfaces:**
- Consumes: `openMessageEventStream` and callbacks `onMessage`, `onGap`, `enabled`.
- Produces: `{ status: "connecting" | "live" | "disconnected"; reconnect(): void }`.

- [ ] **Step 1: Write RED lifecycle tests**

Assert one stream only when enabled + `navigator.onLine` + `document.visibilityState === "visible"`; hidden/offline/unmount aborts; visible/focus/online calls `onGap` once through an in-flight coordinator and starts one stream; failures schedule exactly `[1000,2000,5000,15000,30000]`; after five failures status remains `disconnected` with no timer; manual reconnect starts a fresh sequence.

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd exec -w frontend -- tsx --test tests/unit/features/messaging/use-message-stream.unit.test.tsx`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement lifecycle and bounded retries**

```ts
export const MESSAGE_STREAM_RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 15_000, 30_000] as const;
export type MessageStreamStatus = "connecting" | "live" | "disconnected";
```

Hold the current `AbortController`, retry timer, generation counter, and one `gapPromise` in refs. Every cleanup increments generation before aborting so stale readers cannot schedule retries. Treat an explicit abort as normal. Lifecycle events call one `resumeAfterGap` that coalesces `onGap` and reconnect.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd exec -w frontend -- tsx --test tests/unit/features/messaging/use-message-stream.unit.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/features/messaging/model/use-message-stream.ts frontend/tests/unit/features/messaging/use-message-stream.unit.test.tsx
git commit -m "feat(messages): stream only while visible and online"
```

### Task 14: Replace polling/refetch-after-send with coordinated snapshots

**Files:**
- Modify: `frontend/src/features/messaging/model/use-messages.ts`
- Modify: `frontend/tests/unit/features/messaging/message-workflow.unit.test.ts`
- Modify: `frontend/tests/integration/api/user-chat-client.integration.test.ts`
- Modify: `scripts/request-budget.test.mjs`

**Interfaces:**
- Consumes: `useMessageStream`, `upsertMessages`, `applyMessageToContacts`.
- Changes: manual refresh reloads contacts and selected conversation; send applies the POST response locally; exposes `messageStreamStatus` and `handleReconnectMessages`.

- [ ] **Step 1: Write RED workflow and request-budget tests**

Assert mounting performs one contacts request and one desktop-selected conversation request; waiting beyond 6,000 ms adds no request; manual refresh performs each snapshot once; send performs only one POST and immediately adds its response; a matching event adds no duplicate; simultaneous focus/visibility/online triggers share one snapshot promise. Replace Task 1's temporary polling `test.todo` with the active source assertion.

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd exec -w frontend -- tsx --test tests/unit/features/messaging/message-workflow.unit.test.ts tests/integration/api/user-chat-client.integration.test.ts; npm.cmd run test:scripts`

Expected: FAIL because the hook still sets a six-second interval, refreshes only contacts, refetches after send, and the new source guard matches that interval.

- [ ] **Step 3: Integrate realtime state and snapshots**

First add this active case to `scripts/request-budget.test.mjs`, then remove `POLL_INTERVAL_MS` and the entire interval effect:

```js
test("Messages does not use recurring REST polling", async () => {
  const source = await read("frontend/src/features/messaging/model/use-messages.ts");
  assert.doesNotMatch(source, /POLL_INTERVAL|setInterval\s*\(|\b6_000\b/);
});
```

Change snapshot setters to merge by ID. Add one `snapshotPromiseRef` whose callback loads contacts plus the currently selected thread exactly once. Feed stream messages through contact preview reconciliation and selected-conversation matching. Apply the returned send row locally without REST reloads.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd exec -w frontend -- tsx --test tests/unit/features/messaging/message-workflow.unit.test.ts tests/integration/api/user-chat-client.integration.test.ts; npm.cmd run test:scripts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/features/messaging/model/use-messages.ts frontend/tests/unit/features/messaging/message-workflow.unit.test.ts frontend/tests/integration/api/user-chat-client.integration.test.ts scripts/request-budget.test.mjs
git commit -m "perf(messages): replace polling with realtime snapshots"
```

### Task 15: Surface realtime state and verify the complete user journey

**Files:**
- Modify: `frontend/src/pages/inspector/messages-page.tsx`
- Modify: `frontend/src/widgets/messages/ui/thread-panel.tsx`
- Modify: `frontend/tests/unit/features/messaging/messages-page.unit.test.tsx`
- Modify: `frontend/tests/e2e/journeys/inspector/messages-page.e2e.spec.ts`
- Modify: `documentation/DEPLOYMENT.md`
- Modify: `documentation/SECURITY.md`

**Interfaces:**
- Consumes: `messageStreamStatus`, `handleRefreshMessages`, `handleReconnectMessages` from `useMessages`.
- Produces: accessible `Live`, `Connecting`, or `Disconnected` status and a manual reconnect/refresh action.

- [ ] **Step 1: Write RED component/E2E assertions**

Mock `/api/user-chat/events` as a held streaming response. Assert the page shows `Live updates connected`; inject one `event: message` frame and assert the row appears without a second contacts/conversation GET; hide the document and assert the stream aborts; show/focus it and assert exactly one snapshot; simulate exhausted retries and assert `Live updates disconnected` plus a `Reconnect` button.

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd exec -w frontend -- tsx --test tests/unit/features/messaging/messages-page.unit.test.tsx; npm.cmd exec -w frontend -- playwright test tests/e2e/journeys/inspector/messages-page.e2e.spec.ts`

Expected: FAIL because no realtime status or stream mock exists.

- [ ] **Step 3: Implement accessible status and deployment guidance**

Pass status/reconnect props into `ThreadPanel`. Render a compact `role="status"` label with exact copy `Live updates connected`, `Connecting live updates`, or `Live updates disconnected`; render `Reconnect` only when disconnected. Update deployment docs to require disabling cron-job.org/UptimeRobot equivalents, explain expected Render cold starts, one 15-minute cleanup request, and lazy Realtime usage.

- [ ] **Step 4: Run focused and full verification**

Run:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:scripts
npm.cmd run test:documentation
npm.cmd run test:fast
npm.cmd run test:backend:integration
npm.cmd run test:contract
npm.cmd exec -w frontend -- playwright test tests/e2e/journeys/inspector/messages-page.e2e.spec.ts
npm.cmd run build
```

Expected: every command exits 0; no warnings/errors from the changed tests.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/pages/inspector/messages-page.tsx frontend/src/widgets/messages/ui/thread-panel.tsx frontend/tests/unit/features/messaging/messages-page.unit.test.tsx frontend/tests/e2e/journeys/inspector/messages-page.e2e.spec.ts documentation/DEPLOYMENT.md documentation/SECURITY.md
git commit -m "feat(messages): expose realtime connection status"
```

---

## Final Audit

- Confirm the branch has at least 15 meaningful implementation commits after the two design commits and this plan commit: `git log --oneline --reverse f32569d..HEAD`.
- Confirm `.github/workflows/keep-awake.yml` is absent and `render.yaml` still contains the health path.
- Search for accidental chat polling: `rg -n "POLL_INTERVAL|setInterval" frontend/src/features/messaging frontend/src/entities/message`.
- Search for leaked Supabase browser configuration in the new frontend code: `rg -n "SUPABASE|service.role|anon.key" frontend/src/entities/message frontend/src/features/messaging`.
- Run the full verification sequence from Task 15 against a clean worktree.
- Request an independent whole-branch code review, fix every Critical/Important finding, and rerun affected tests before completion.
