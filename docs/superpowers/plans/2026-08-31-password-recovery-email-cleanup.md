# Password Recovery Email Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the unused recovery-code/OTP presentation while preserving the secure Supabase confirmation link.

**Architecture:** Keep the existing Supabase recovery flow unchanged. The recovery email will expose only `{{ .ConfirmationURL }}`; a source-based regression test will guard that contract and prevent reintroducing `{{ .Token }}` into this template.

**Tech Stack:** Supabase HTML email templates, Markdown, Node.js `node:test`, TypeScript test runner.

## Global Constraints

- Keep `{{ .ConfirmationURL }}` as the only password-recovery action URL.
- Do not alter Supabase’s internal `otp_expired` error handling.
- Do not change unrelated confirmation, invite, magic-link, email-change, or reauthentication templates.
- Do not expose or add credentials, reset tokens, or personal data.

---

### Task 1: Guard and clean the recovery email template

**Files:**
- Create: `backend/tests/unit/auth/recovery-email-template.unit.test.ts`
- Modify: `backend/supabase/templates/recovery.html`
- Modify: `backend/supabase/templates/README.md`

**Interfaces:**
- Consumes: Supabase recovery template variables.
- Produces: A recovery email containing secure confirmation links and no unused recovery-code presentation.

- [x] **Step 1: Write the failing test**

Create `backend/tests/unit/auth/recovery-email-template.unit.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const template = readFileSync("backend/supabase/templates/recovery.html", "utf8");

test("password recovery email uses the confirmation URL without presenting an unused OTP", () => {
  assert.match(template, /\{\{ \.ConfirmationURL \}\}/);
  assert.doesNotMatch(template, /Recovery Code/);
  assert.doesNotMatch(template, /\{\{ \.Token \}\}/);
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm.cmd exec --workspace backend -- tsx --test tests/unit/auth/recovery-email-template.unit.test.ts`

Expected: FAIL because the current recovery template contains the `Recovery Code` label and `{{ .Token }}`.

- [x] **Step 3: Remove the unused recovery-code presentation**

In `backend/supabase/templates/recovery.html`, remove the `.code-wrap` CSS rule and the `<div class="code-wrap">` block containing `Recovery Code` and `{{ .Token }}`. Keep both `{{ .ConfirmationURL }}` links.

In `backend/supabase/templates/README.md`, change the template-variable note to state that the recovery template uses `{{ .ConfirmationURL }}` and that `{{ .Token }}` remains documented only for templates that intentionally display a code.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `npm.cmd exec --workspace backend -- tsx --test tests/unit/auth/recovery-email-template.unit.test.ts`

Expected: PASS.

- [x] **Step 5: Run the relevant backend checks**

Run: `npm.cmd run test:unit -w backend` and `npm.cmd run build:backend`

Expected: all backend unit tests pass and the backend build exits successfully.

- [x] **Step 6: Commit the implementation**

```bash
git add backend/tests/unit/auth/recovery-email-template.unit.test.ts backend/supabase/templates/recovery.html backend/supabase/templates/README.md
git commit -m "fix: remove unused recovery email code"
```
