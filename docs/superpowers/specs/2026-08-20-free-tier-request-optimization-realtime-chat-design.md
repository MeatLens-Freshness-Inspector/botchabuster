# Free-Tier Request Optimization and Realtime Chat Design

## Context

MeatLens currently generates recurring traffic even when that traffic is not tied to user actions:

- `.github/workflows/keep-awake.yml` calls the Render health endpoint every five minutes. This deliberately prevents a free Render web service from becoming idle.
- `SessionCleanupService` runs immediately at backend startup and every 60 seconds. Every run performs two Supabase delete requests even when no session row matches.
- The Messages screen calls both the contacts endpoint and the selected-conversation endpoint every six seconds. One open thread therefore generates 1,200 backend requests and approximately 5,400 downstream Supabase requests per hour.

The application still needs server-side session cleanup and realtime chat. The design must preserve those behaviors without maintaining the existing polling and keep-awake traffic.

## Goals

- Allow the Render free service to spin down when nobody is using MeatLens.
- Preserve Render's native application health check.
- Keep periodic cleanup of idle and absolutely expired session rows.
- Reduce session cleanup from two Supabase requests every minute to one request every 15 minutes while the backend is running.
- Deliver chat messages in realtime while the authenticated Messages screen is online and visible.
- Remove all six-second chat polling.
- Preserve the current server-side authorization boundary and never expose the Supabase service key to the browser.
- Bound reconnects, stream connections, and message sends so failures or abusive clients cannot create a new request storm.

## Non-goals

- Background mobile push notifications while the Messages screen is closed or hidden.
- Typing indicators, read receipts, or online-presence indicators.
- Direct browser access to Supabase tables or a browser-held Supabase Auth session.
- Removing user-initiated REST requests such as opening a conversation, sending a message, or manually refreshing.
- Redesigning the unrelated AI assistant streaming endpoint.

## Selected Architecture

The backend remains the only trusted chat and session gateway. Chat uses an authenticated HTTP event stream from Render to the visible Messages screen. The backend lazily maintains one service-role Supabase Realtime subscription for all connected chat clients on that backend instance. Session cleanup remains an in-process scheduler, but it runs at a guarded 15-minute default and performs a single combined delete.

The GitHub keep-awake workflow is removed. Render's configured `healthCheckPath` remains because it is a lightweight readiness check with no Supabase dependency. Any separately configured cron-job.org or uptime-monitor request must also be disabled by the deployer.

## Realtime Chat

### Transport and lifecycle

The frontend opens `GET /api/user-chat/events` with streaming `fetch`, not native `EventSource`. Streaming `fetch` can reuse the existing `createAuthHeaders` behavior: browser clients use the HttpOnly cookie transport and Capacitor/native clients retain the bearer-token fallback. Session tokens never appear in URLs.

The stream is open only while all of the following are true:

- the user has an online-authenticated session;
- the Messages screen is mounted;
- the browser document is visible; and
- the device is online.

The frontend aborts the stream on logout, offline transition, page unmount, document hiding, or the existing inactivity lock. Returning to a visible, focused Messages screen opens a new stream and performs one snapshot refresh. Server heartbeat comments keep intermediaries from buffering or dropping a live stream, but they do not create new HTTP or Supabase requests and do not count as user session activity.

The stream response uses `text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, and `X-Accel-Buffering: no`. The backend removes every listener, queue, timer, and response reference when the request closes.

### Shared Supabase subscription

A process-wide `ChatRealtimeHub` owns the upstream subscription and connected-client registry:

- The first authenticated stream client starts one Supabase Realtime channel subscribed to `INSERT` events for `public.user_chat_messages`.
- Additional clients share the same upstream channel.
- Each database event is delivered only to connections whose authenticated user ID equals the row's `sender_id` or `recipient_id`.
- The last stream client disconnecting removes the Supabase channel, leaving no Realtime connection while chat is unused.
- Backend shutdown removes the channel and closes all client streams.

A forward-only Supabase migration adds only `public.user_chat_messages` to the `supabase_realtime` publication. The browser receives no Supabase URL, key, or service-role credential as part of this change. Message inserts continue through the existing authorized backend POST endpoint.

### Client state flow

Opening Messages still loads contacts once. Selecting a contact loads that conversation once. Stream events carry the complete inserted message row.

The messaging state applies messages by ID:

- a new event is inserted once and ordered by `(created_at, id)`;
- an event for the selected conversation appears immediately in the thread;
- every event updates and reorders the relevant contact preview locally;
- the POST response for a sent message is applied immediately; the matching streamed echo is deduplicated;
- sending a message no longer triggers contacts and conversation refetches.

Manual refresh reloads both contacts and the selected conversation. Refocusing or reconnecting after a stream gap performs the same one-time snapshot refresh, so events missed during a deploy, cold start, or network interruption are recovered. Snapshot rows and streamed rows use the same ID-based upsert path, making their arrival order harmless.

### Reconnection and failure behavior

Unexpected stream failures retry with bounded delays of 1, 2, 5, 15, and 30 seconds. After five consecutive failed reconnects, automatic retries stop. The UI retains its last snapshot, shows a disconnected state, and waits for a manual refresh, a new focus event, or a new browser `online` event before starting another bounded sequence. There is no timed REST-polling fallback.

Background snapshot refresh failures retain existing contacts and messages. Manual refresh failures show an error. A failed send restores the unsent draft using the existing behavior.

### Connection and send limits

- At most two live streams are allowed per authenticated user.
- At most 100 live chat streams are allowed per backend instance.
- When a per-user stream limit is exceeded, the oldest connection is closed before accepting the newest connection.
- Per-connection buffered output is limited to 100 events or 256 KiB, whichever is reached first. A connection that cannot drain within those bounds is closed and must recover through the snapshot-on-reconnect path.
- Message sends are limited to 30 accepted messages per authenticated user per minute using an in-memory, request-driven limiter with no cleanup timer.

These limits protect the single free Render instance without adding idle database traffic.

## Session Cleanup

### Schedule

`SessionCleanupService` remains responsible for periodic global cleanup. It retains its immediate startup run, overlap protection, and shutdown cleanup.

`SESSION_CLEANUP_INTERVAL_SECONDS` changes as follows:

- default: `900` seconds;
- minimum accepted value: `300` seconds; and
- no clamp to `SESSION_IDLE_TIMEOUT_SECONDS`.

The idle timeout continues to be enforced by `touchSession` on authenticated requests. A cleanup interval longer than an unusually short idle timeout therefore delays only physical row removal; it never extends authorization validity.

### One-request cleanup

The two sequential global deletes become one atomic Supabase request. The combined predicate deletes a row when either:

- `expires_at <= now`; or
- `last_seen_at <= idleCutoff`.

The delete requests an exact count instead of returning every deleted ID. Existing indexes on `expires_at` and `last_seen_at` support both branches, so no cleanup-specific database migration is required.

With one continuously running backend instance, the new maximum baseline is one startup request plus 96 cleanup requests per day. The current baseline is two startup requests plus 2,880 cleanup requests per day. When Render is spun down, the timer does not run and produces no Supabase traffic.

### Sign-in and device slots

The existing per-user prune during session reservation is expanded to delete both absolutely expired and idle rows for that user in one request. Active-session counting applies both the absolute-expiry and idle-cutoff filters. This prevents a stale row from blocking a replacement sign-in even when the global cleanup timer has not run recently or the backend has just awakened.

Ordinary authenticated requests continue to call `touchSession`; missing, expired, or idle session rows remain rejected and are never silently re-registered.

## Render and Deployment Behavior

`.github/workflows/keep-awake.yml` is removed. The deployment keeps `render.yaml`'s `/api/analysis/health` path because the controller returns in-memory JSON and performs no Supabase operation.

The expected deployment behavior is:

- no application-generated inbound Render traffic while no user is active;
- no session-cleanup traffic while Render is spun down;
- a normal cold start when the next legitimate request arrives;
- one lazy upstream Supabase Realtime connection only while at least one visible Messages screen has a stream; and
- one cleanup request every 15 minutes only while the backend process is running.

Deployment documentation explicitly instructs maintainers to remove any separately configured cron-job.org, UptimeRobot, or equivalent monitor that calls the production service more often than Render's idle window. Render's own health check remains enabled.

## Security Boundaries

- The Supabase service key remains backend-only.
- Direct browser-to-Supabase Realtime is excluded because the application deliberately revokes the temporary Supabase Auth session and replaces it with a MeatLens-signed app session. Existing chat RLS also grants chat access only to `service_role`.
- Every stream is authenticated through `resolveTrackedRequestAuthContext` before headers are committed.
- The stream route explicitly validates `Origin` against the configured allowlist even though it is a GET endpoint.
- Fan-out uses the server-authenticated user ID; clients never choose or claim a delivery topic.
- A message is delivered only to its sender and recipient.
- Existing backend conversation authorization remains authoritative for sends and conversation snapshots.
- Stream heartbeats never update `last_seen_at`.
- Logout, local inactivity lock, token absolute expiry, request closure, and backend shutdown terminate the stream.

## Verification Strategy

### Frontend tests

- Opening Messages performs one contacts load and one selected-thread load, with no interval registration.
- A hidden or unmounted Messages screen has no stream and makes no requests.
- Focusing a visible screen or returning online opens one stream and performs one snapshot refresh.
- Manual refresh reloads contacts and the selected thread exactly once.
- Stream events are participant-scoped, deduplicated by ID, ordered deterministically, and update contact previews.
- Sending uses the POST response and streamed echo without follow-up snapshot requests or duplicate messages.
- Reconnect attempts follow the five configured delays and stop instead of polling forever.

### Backend tests

- The stream accepts valid cookie and bearer sessions and rejects unauthenticated or disallowed-origin requests.
- Multiple client streams share one upstream Supabase subscription.
- Sender and recipient receive an inserted message; unrelated users receive nothing.
- The upstream channel is removed after the last client disconnects and during backend shutdown.
- Per-user, per-instance, send-rate, buffer, and backpressure limits are enforced.
- Request aborts and upstream errors release all resources.

### Session-cleanup tests

- Default cleanup interval is 900 seconds and values below 300 seconds clamp to 300.
- Cleanup interval is not shortened to match a smaller idle timeout.
- One cleanup run performs one delete with the combined expiry/idle predicate and reports the exact count.
- Startup remains immediate, periodic runs do not overlap, and shutdown clears the interval.
- Session reservation prunes idle rows and active-session counts exclude them.

### Infrastructure guardrails

- No scheduled GitHub workflow may call the production Render health URL.
- `render.yaml` must retain the native health-check path.
- Source-level request-budget tests prevent the Messages feature from reintroducing periodic REST polling.

## Success Criteria

- With no users, repository-controlled traffic does not keep Render awake.
- With Render continuously awake, session cleanup makes no more than 96 scheduled Supabase requests per day per backend instance, plus one request per process start.
- A visible Messages screen receives new messages without periodic contacts or conversation requests.
- Leaving the Messages screen or hiding the document closes both its downstream stream and, when it is the final client, the shared upstream Supabase subscription.
- Existing session idle timeout, absolute expiry, device limit, chat participant authorization, and manual refresh behavior remain enforced.
