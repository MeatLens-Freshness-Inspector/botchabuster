# Post-Signup Inspector Onboarding Design

Date: 2026-05-31
Status: Approved for planning

## Summary

Keep sign-up simple and move first-time inspector onboarding to a dedicated full-screen tutorial that appears only after email verification and first successful sign-in. The tutorial should enforce a small set of required steps before a non-admin inspector can enter the app, while leaving secondary feature discovery optional.

## Goals

- Keep the public sign-up flow lean and low-friction.
- Show onboarding only to first-time non-admin inspectors.
- Gate app access until required onboarding steps are completed.
- Persist onboarding completion in the database so behavior is consistent across devices and sessions.
- Reuse the current light-theme auth visual language and existing profile fields.
- Focus the tutorial on real inspector tasks, especially `Inspect` and `History`.

## Non-Goals

- Building a multi-page sign-up wizard.
- Adding onboarding for admin users.
- Requiring optional features like `Messages` or `Profile` to be completed before app access.
- Creating an admin UI for resetting onboarding state in this iteration.
- Refactoring unrelated auth, profile, or routing flows.

## Current Context

The current app has:

- a single `/signup` page that collects `full name`, `email`, `password`, and `access code`
- a `check your email` style sign-up completion behavior
- a light-theme public auth surface on `/`, `/signup`, `/login`, `/forgot-password`, and `/reset-password`
- protected app routes for `/inspect`, `/history`, `/messages`, `/profile`, and `/admin`
- profile-backed user state already loaded through `AuthContext`
- an existing `profiles` table and profile API used for persistent user preferences and profile edits

The current first-run app surface for inspectors is `Inspect`, with `History`, `Messages`, and `Profile` available through the bottom navigation. There is no existing first-time onboarding flag in the schema or frontend state.

## Approved Approach

Use a dedicated first-login onboarding gate at a new `/onboarding` route.

Flow:

1. User signs up through the existing simple sign-up page.
2. User verifies email through the normal auth flow.
3. User signs in for the first time.
4. App loads auth session, profile, and role state.
5. If the user is a non-admin and has not completed onboarding, route them to `/onboarding` before any app page opens.
6. After required onboarding is completed, persist completion on the profile and redirect the user to `/inspect`.
7. Returning non-admin users bypass onboarding.
8. Admin users always bypass onboarding.

This approach matches the desired product behavior while keeping sign-up itself clean.

## Onboarding Scope

The onboarding is only for inspectors.

Admin handling:

- admins do not see the tutorial
- admins are onboarded manually outside the product
- any admin who manually visits `/onboarding` should be redirected to `/inspect`

Inspector handling:

- onboarding appears only after first verified sign-in
- required steps must be completed once before app entry
- optional feature discovery can be skipped

## Route And Guard Design

Add a dedicated public-but-auth-dependent route:

- `/onboarding`

Guard rules:

- not signed in: redirect to `/login`
- signed-in admin: redirect to `/inspect`
- signed-in non-admin with completed onboarding: redirect to `/inspect`
- signed-in non-admin without completed onboarding: allow `/onboarding`

Protected app behavior:

- any attempt by a signed-in non-admin without completed onboarding to open `/inspect`, `/history`, `/messages`, or `/profile` should redirect to `/onboarding`
- `/admin` already requires admin status and is unaffected beyond bypassing onboarding entirely

Loading behavior:

- while auth, profile, or role state is unresolved, keep the current loading behavior instead of rendering a partial app shell

## Persistence Model

Persist onboarding state on `profiles`.

Recommended schema additions:

- `onboarding_completed_at TIMESTAMPTZ NULL`
- `onboarding_version INTEGER NOT NULL DEFAULT 1`

Behavior rules:

- `onboarding_completed_at IS NULL` means onboarding is incomplete
- non-null `onboarding_completed_at` means required onboarding is complete
- `onboarding_version` provides a future reset path if onboarding content changes later

This state must not rely on local storage because onboarding should remain completed across devices, browsers, and reinstalls.

## API And Data Model Changes

Extend the profile model across backend and frontend to include:

- `onboarding_completed_at`
- `onboarding_version`

The existing profile update surface should support:

- saving required `Confirm Profile` changes during onboarding
- saving onboarding completion when the user finishes the flow

The implementation may use either:

- the existing `PUT /profiles/:id` endpoint with additional allowed fields, or
- a dedicated completion endpoint if that produces a cleaner contract

For this iteration, the simpler option is to extend the existing profile update pipeline unless implementation review shows a strong reason to split completion into a dedicated endpoint.

## Tutorial Step Design

The onboarding should contain five core screens followed by a final completion screen for optional discovery and exit into the app.

### 1. Welcome

Purpose:

- introduce the first-time setup
- set expectation that this is short and inspector-focused

Rules:

- informational only
- primary action: `Begin setup`

### 2. Safety And Usage

Purpose:

- communicate that MeatLens is a decision-support tool
- reinforce that official inspection procedures still apply

Rules:

- required
- user must explicitly acknowledge before continuing

### 3. Confirm Profile

Purpose:

- verify inspector identity details before app access

Fields:

- editable: `full_name`
- editable: `email`
- read-only reference: `inspector_code`

Rules:

- required
- use real persistence, not temporary form-only state
- keep the current sign-up access code semantics intact

### 4. How Inspect Works

Purpose:

- explain the real inspection workflow in practical terms

Content focus:

- select market or location
- capture a sample
- run analysis
- review classification and confidence
- save the record

Rules:

- required
- keep the content concise and task-oriented

### 5. How History Works

Purpose:

- explain where saved inspections can be reviewed later

Content focus:

- reviewing past records
- checking classifications and confidence
- using history for follow-up and traceability

Rules:

- required

## Optional Discovery Content

After the five core screens, show a final completion screen with optional discovery content.

Optional topics:

- `Messages`
- `Profile`

Rules:

- optional topics must not block completion
- primary CTA: `Start Inspecting`
- secondary CTA can support optional exploration language, but completion must remain direct and obvious

## UI Direction

The onboarding should reuse the existing public auth tone:

- light theme
- centered single-card layout
- clean spacing
- minimal helper text
- no heavy decorative marketing treatment

Interaction design:

- full-screen route without the bottom nav or app shell visible behind it
- compact progress indicator such as `Step 2 of 5`
- short title and one-line helper copy per step
- back action available on prior steps
- mobile-first spacing and controls

The result should feel simple and elegant, not theatrical.

## Interaction Rules

- users can go back between steps
- required steps cannot be skipped
- optional discovery content is placed after the required path
- refresh during onboarding should keep the user in `/onboarding` until completion
- final completion happens only after the user intentionally confirms the last required action

## Error Handling

- If auth or profile state is still loading after sign-in, hold on the existing loading state until routing can be decided safely.
- If onboarding status cannot be read for a signed-in non-admin user, fail closed and show a blocking retry state instead of allowing app entry.
- If `Confirm Profile` save fails, keep the user on that step and show the real error.
- If onboarding completion save fails, keep the user on the final screen and allow retry; do not route them into `/inspect`.
- If a completed user manually visits `/onboarding`, redirect to `/inspect`.
- If an admin manually visits `/onboarding`, redirect to `/inspect`.

## Testing Strategy

Add tests that cover the route gating and required onboarding behavior.

Core scenarios:

- first verified non-admin login with no completion flag redirects to `/onboarding`
- returning non-admin with completion flag bypasses onboarding
- admin user bypasses onboarding
- protected app routes redirect incomplete inspectors to `/onboarding`
- required steps cannot be skipped
- `Confirm Profile` saves `full_name` and `email` correctly
- onboarding completion persists and then redirects to `/inspect`
- completed users who visit `/onboarding` are redirected away
- profile-save and onboarding-completion failures show blocking retry states

Manual verification should also confirm:

- the onboarding matches the existing auth visual language
- mobile layout remains usable
- the tutorial feels short and practical
- `Inspect` and `History` guidance reflects real app behavior rather than placeholder copy

## Risks And Mitigations

- Risk: onboarding becomes a generic product tour.
  Mitigation: keep required content limited to safety, profile confirmation, inspect flow, and history flow.

- Risk: users get stuck because profile or completion writes fail.
  Mitigation: show blocking retry states and do not route forward until persistence succeeds.

- Risk: future onboarding revisions require re-running the tutorial.
  Mitigation: include `onboarding_version` from the start.

- Risk: admin users accidentally enter the inspector flow.
  Mitigation: explicitly bypass onboarding for admins at the guard level.

## Acceptance Criteria

- Sign-up remains a simple single-page account creation flow.
- New non-admin inspectors see onboarding only after email verification and first successful sign-in.
- Admin users never see the tutorial.
- A signed-in non-admin inspector without onboarding completion cannot enter the app until required steps are completed.
- Required steps include Safety and Usage, Confirm Profile, How Inspect Works, and How History Works.
- `Inspect` and `History` are required tutorial content; `Messages` and `Profile` are optional only.
- Onboarding completion is persisted on the profile record and survives device changes.
- Successful completion redirects the inspector to `/inspect`.
