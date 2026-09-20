# Message Time Separators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Messenger-like conversation time separators at 30-minute gaps while preserving every message's existing timestamp.

**Architecture:** Keep `ThreadPanel` responsible for presentation and add a small pure helper under the messaging feature for the threshold decision. The helper compares adjacent message timestamps in the existing array; the panel renders an accessible separator before the first message and before later messages whose gap is at least 30 minutes. No API, backend, or message type changes are needed.

**Tech Stack:** React 18, TypeScript, `node:test`, React server-rendered component tests, Tailwind utility classes, `date-fns`-backed existing timestamp formatter.

## Global Constraints

- Preserve existing per-message timestamps, sender alignment, message order, and empty/loading/no-contact states.
- Use a 30-minute inclusive threshold: `current.created_at - previous.created_at >= 30 * 60 * 1000`.
- Keep the separator presentation-only; do not change backend contracts or persisted data.
- Follow the repository CI gate: frontend lint, typecheck, unit, component, and integration tests remain required.
- Keep the work within 3–6 commits; use one design commit already created, then test and implementation commits.

---

### Task 1: Add the failing time-gap helper tests

**Files:**
- Create: `frontend/tests/unit/features/messaging/message-time-separators.unit.test.ts`
- Create later: `frontend/src/features/messaging/lib/message-time-separators.ts`

**Interfaces:**
- Produces the required behavior contract for `shouldRenderMessageTimeSeparator(previousCreatedAt, currentCreatedAt)`.

- [ ] **Step 1: Write the failing test**

Create the test with explicit ISO timestamps and coverage for the first message, a 29-minute gap, an exact 30-minute gap, and a 31-minute gap:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { shouldRenderMessageTimeSeparator } from "../../../../src/features/messaging/lib/message-time-separators";

test("renders a separator before the first message", () => {
  assert.equal(shouldRenderMessageTimeSeparator(null, "2026-09-20T10:00:00.000Z"), true);
});

test("does not separate messages 29 minutes apart", () => {
  assert.equal(
    shouldRenderMessageTimeSeparator(
      "2026-09-20T10:00:00.000Z",
      "2026-09-20T10:29:00.000Z",
    ),
    false,
  );
});

test("separates messages exactly 30 minutes apart", () => {
  assert.equal(
    shouldRenderMessageTimeSeparator(
      "2026-09-20T10:00:00.000Z",
      "2026-09-20T10:30:00.000Z",
    ),
    true,
  );
});

test("separates messages 31 minutes apart", () => {
  assert.equal(
    shouldRenderMessageTimeSeparator(
      "2026-09-20T10:00:00.000Z",
      "2026-09-20T10:31:00.000Z",
    ),
    true,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from the repository root:

```powershell
npm run test:unit -w frontend -- --test-name-pattern="time separator"
```

Expected: FAIL because `frontend/src/features/messaging/lib/message-time-separators.ts` does not exist yet.

- [ ] **Step 3: Commit the failing test**

```powershell
git add frontend/tests/unit/features/messaging/message-time-separators.unit.test.ts
git commit -m "test: define message time separator threshold"
```

### Task 2: Implement the threshold helper

**Files:**
- Create: `frontend/src/features/messaging/lib/message-time-separators.ts`
- Test: `frontend/tests/unit/features/messaging/message-time-separators.unit.test.ts`

**Interfaces:**
- Produces `MESSAGE_TIME_SEPARATOR_THRESHOLD_MS: number` and `shouldRenderMessageTimeSeparator(previousCreatedAt: string | null, currentCreatedAt: string): boolean`.

- [ ] **Step 1: Write minimal implementation**

```ts
export const MESSAGE_TIME_SEPARATOR_THRESHOLD_MS = 30 * 60 * 1000;

export function shouldRenderMessageTimeSeparator(
  previousCreatedAt: string | null,
  currentCreatedAt: string,
): boolean {
  if (!previousCreatedAt) return true;

  const previousTime = new Date(previousCreatedAt).getTime();
  const currentTime = new Date(currentCreatedAt).getTime();

  if (Number.isNaN(previousTime) || Number.isNaN(currentTime)) return false;

  return currentTime - previousTime >= MESSAGE_TIME_SEPARATOR_THRESHOLD_MS;
}
```

- [ ] **Step 2: Run the helper tests to verify they pass**

```powershell
npm run test:unit -w frontend -- --test-name-pattern="time separator"
```

Expected: PASS for all four threshold cases.

- [ ] **Step 3: Commit the helper**

```powershell
git add frontend/src/features/messaging/lib/message-time-separators.ts
git commit -m "feat: add message time separator threshold"
```

### Task 3: Render separators in the conversation thread

**Files:**
- Modify: `frontend/src/widgets/messages/thread-panel.tsx`
- Modify: `frontend/tests/component/messages/thread-panel.component.test.tsx`

**Interfaces:**
- Consumes `shouldRenderMessageTimeSeparator` from `@/features/messaging/lib/message-time-separators` and the existing `formatTimestamp` helper.
- Produces an accessible separator before qualifying messages while retaining each bubble's timestamp.

- [ ] **Step 1: Write the failing component test**

Add a message fixture and a render helper, then add this test to `frontend/tests/component/messages/thread-panel.component.test.tsx`:

```tsx
import { formatTimestamp } from "../../../src/features/messaging/lib/formatters";

const messages = [
  {
    id: "message-1",
    sender_id: "user-1",
    recipient_id: "user-2",
    content: "First message",
    created_at: "2026-09-20T10:00:00.000Z",
  },
  {
    id: "message-2",
    sender_id: "user-2",
    recipient_id: "user-1",
    content: "Reply after a pause",
    created_at: "2026-09-20T10:30:00.000Z",
  },
];

test("renders a 30-minute separator while keeping per-message timestamps", () => {
  const html = renderToStaticMarkup(
    <ThreadPanel
      currentUserId="user-1"
      selectedContact={{
        id: "user-2",
        full_name: "Chat Contact",
        email: null,
        inspector_code: null,
        location: null,
        role: "user",
        last_message_preview: "Reply after a pause",
        last_message_at: messages[1].created_at,
      }}
      messages={messages}
      isDesktop
      isLoadingMessages={false}
      isSendingMessage={false}
      draftMessage=""
      lastMessageRef={createRef<HTMLDivElement>()}
      connectionStatus="connected"
      onBack={() => {}}
      onDraftChange={() => {}}
      onSendMessage={() => {}}
      onReconnect={() => {}}
    />,
  );

  assert.equal((html.match(/role="separator"/g) ?? []).length, 2);
  assert.match(html, new RegExp(`aria-label="${formatTimestamp(messages[0].created_at)}"`));
  assert.match(html, new RegExp(`aria-label="${formatTimestamp(messages[1].created_at)}"`));
  assert.match(html, /First message/);
  assert.match(html, /Reply after a pause/);
});
```

- [ ] **Step 2: Run the component test to verify it fails**

```powershell
npm run test:component -w frontend -- thread-panel.component.test.tsx
```

Expected: FAIL because `ThreadPanel` currently renders no `role="separator"` elements.

- [ ] **Step 3: Write the minimal UI implementation**

Import `shouldRenderMessageTimeSeparator`, then replace the direct `messages.map` body with an indexed map that renders the separator before the qualifying message:

```tsx
{messages.map((message, index) => {
  const mine = message.sender_id === currentUserId;
  const previousMessage = messages[index - 1];
  const showTimeSeparator = shouldRenderMessageTimeSeparator(
    previousMessage?.created_at ?? null,
    message.created_at,
  );

  return (
    <div key={message.id}>
      {showTimeSeparator ? (
        <div
          role="separator"
          aria-label={formatTimestamp(message.created_at)}
          className="mb-3 flex items-center gap-3 px-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          <span className="shrink-0">{formatTimestamp(message.created_at)}</span>
          <span className="h-px flex-1 bg-border/70" aria-hidden="true" />
        </div>
      ) : null}
      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-[82%] rounded-2xl border px-3 py-2 ${
            mine
              ? "border-primary/40 bg-[hsl(var(--primary)/0.18)] text-foreground"
              : "border-border/70 bg-background/75 text-foreground"
          }`}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          <p className="mt-1 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {formatTimestamp(message.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
})}
```

- [ ] **Step 4: Run focused tests to verify they pass**

```powershell
npm run test:unit -w frontend -- --test-name-pattern="time separator"
npm run test:component -w frontend -- thread-panel.component.test.tsx
```

Expected: all helper and thread-panel assertions pass, including two separators and two per-message timestamps.

- [ ] **Step 5: Commit the UI change**

```powershell
git add frontend/src/widgets/messages/thread-panel.tsx frontend/tests/component/messages/thread-panel.component.test.tsx
git commit -m "feat: show message time separators after long pauses"
```

### Task 4: Run the repository quality gates

**Files:**
- No source changes expected.

- [ ] **Step 1: Run frontend lint and typecheck**

```powershell
npm run lint -w frontend
npm run typecheck -w frontend
```

Expected: both commands exit 0 with no lint or type errors.

- [ ] **Step 2: Run frontend unit, component, and integration lanes**

```powershell
npm run test:unit -w frontend
npm run test:component -w frontend
npm run test:integration -w frontend
```

Expected: all three lanes exit 0. These are the frontend lanes selected by `.github/workflows/ci.yml` for this change.

- [ ] **Step 3: Inspect final diff and commit status**

```powershell
git diff HEAD~3..HEAD --check
git status --short --branch
git log -4 --oneline
```

Expected: no whitespace errors, only the design spec, helper test/helper, and thread panel changes are present, and the branch contains the requested 3–6 commits for this work.
