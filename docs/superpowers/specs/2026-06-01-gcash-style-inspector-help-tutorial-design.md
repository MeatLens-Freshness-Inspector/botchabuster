# GCash-Style Inspector Help Tutorial Design

Date: 2026-06-01
Status: Approved for planning
Supersedes: `docs/superpowers/specs/2026-05-31-post-signup-inspector-onboarding-design.md`

## Summary

Replace the current blocked, card-by-card onboarding flow with a GCash-inspired guided tutorial model for inspectors. First-time non-admin inspectors should still be auto-routed into onboarding after sign-in, but the experience should be a visible, interactive product demo with simulated screens, strict guided taps, and a persistent replay surface under `Profile > Help`.

The onboarding should feel like an in-app coach, not a settings wizard. Users should be able to skip into the app for the current signed-in session, but incomplete onboarding should auto-open again on a later sign-in until the required demos are finished once.

## Reference Pattern

This direction is intentionally based on two verified GCash patterns:

- GCash keeps help reachable from `Profile > Help`, including follow-up support actions.
- GCash uses short guided, step-based help content for new-user education rather than burying it in settings.

Reference sources:

- https://help.gcash.com/hc/en-us/articles/900006590163-How-to-follow-up-on-my-GCash-ticket
- https://help.gcash.com/hc/en-us/articles/19577792850457-How-do-I-get-started-with-GCash

## Goals

- Give first-time inspectors a visible, guided tutorial that teaches the app through interaction.
- Preserve automatic first-run onboarding for non-admin inspectors.
- Let users skip into the app immediately when needed without falsely marking onboarding complete.
- Re-show onboarding on a later sign-in until the required tutorial is completed once.
- Make tutorials permanently replayable from `Profile > Help`.
- Focus the required guidance on safety, profile orientation, inspect workflow, and history workflow.
- Keep the experience elegant, short, and mobile-first.

## Non-Goals

- Reworking the public sign-up form into a multi-page wizard.
- Building onboarding for admins.
- Using the real `Inspect` or `History` pages as the tutorial surface in this iteration.
- Making the tutorial a freeform sandbox.
- Adding admin tooling to reset tutorial state in this iteration.
- Pushing changes to GitHub or introducing PR workflow as part of this design.

## Current Context

The current implementation already has:

- a simple single-page sign-up flow
- auth-gated onboarding for incomplete non-admin inspectors
- profile persistence via `profiles`
- `onboarding_completed_at` and `onboarding_version` fields on the profile contract
- a linear onboarding page at `/onboarding`
- a `Profile` page with no dedicated help hub

The current problem is not the existence of onboarding. The problem is that the experience behaves like a blocked step form instead of a visible tutorial that users can understand, practice, and revisit later.

## Approved Product Direction

Use a dedicated help-and-tutorial model with two entry points:

1. `First-run onboarding entry`
   First verified sign-in for an incomplete non-admin inspector auto-opens `/onboarding`.

2. `Persistent help entry`
   `Profile > Help` opens a dedicated help hub where users can replay individual tutorials at any time.

This keeps the required first-run guidance while aligning the UI with a GCash-like help pattern.

## Routing And Access Model

### Routes

Keep `/onboarding` as the first-run tutorial route and add a dedicated help destination:

- `/onboarding`
- `/profile/help`

The help surface should be a real destination, not a small inline widget.

### Access Rules

- not signed in: redirect to `/login`
- signed-in admin: bypass onboarding and access the app normally
- signed-in non-admin with completed onboarding: bypass `/onboarding`
- signed-in non-admin with incomplete onboarding:
  - auto-open `/onboarding` after sign-in
  - may skip into the app for the current signed-in session
  - will be auto-routed to `/onboarding` again on a later sign-in if still incomplete

### Protected App Behavior

For incomplete inspectors:

- if they have not skipped onboarding in the current session, protected routes redirect to `/onboarding`
- if they used `Skip for now` in the current session, they may access the app until they sign out or the session resets

For completed inspectors:

- all protected routes behave normally
- help tutorials remain replayable from the help hub without changing completion state

### Admin Behavior

- admins never auto-enter onboarding
- admins do not see inspector tutorial requirements
- admins do not need a `Help` tutorial hub for this feature because they are onboarded manually

## Tutorial Interaction Model

The tutorial should be a strict guided simulation, not a static card flow and not a real-data sandbox.

### Core Interaction Rules

- each tutorial uses a simulated MeatLens screen
- only one control is active at a time
- the active control is highlighted
- all non-highlighted controls remain visible but inactive
- the tutorial advances only when the user taps the correct highlighted target

This must feel like a controlled practice run.

### Why Simulation Instead Of Real Screens

The user explicitly approved simulated screens because:

- the UI remains visible and understandable
- users can practice safely
- no live records or analysis state are touched
- the tutorial can stay strict and deterministic
- the same demo engine can be replayed later from Help

## Required Onboarding Flow

The first-run onboarding sequence contains four required sections:

1. `Safety acknowledgement`
2. `Profile walkthrough`
3. `Inspect demo`
4. `History demo`

Onboarding is considered complete only after all four are finished once.

### 1. Safety Acknowledgement

Purpose:

- explain that MeatLens is a decision-support tool
- reinforce that official protocols still govern final inspection decisions

Behavior:

- starts with a short intro panel
- ends only when the user taps the required acknowledgement control

### 2. Profile Walkthrough

Purpose:

- orient the user to where profile details and support tools live

Behavior:

- uses a simulated profile screen only
- does not edit or save real profile data
- highlights where the user will later find:
  - name
  - email
  - access code
  - help

### 3. Inspect Demo

Purpose:

- teach the primary inspection workflow through visible interaction

Required simulated actions:

- choose market
- open capture
- run analysis
- save result

No real data is written.

### 4. History Demo

Purpose:

- teach where past inspections are reviewed

Required simulated actions:

- open history
- open a saved item
- review classification, confidence, and explanation
- return to the list

No real data is written.

### Completion Screen

After all required sections finish:

- show a short completion screen
- primary CTA: `Start Inspecting`
- secondary CTA: `Open Help`

Completion persists by writing `onboarding_completed_at`.

## Skip Behavior

`Skip for now` must be visible from the onboarding shell header.

Approved behavior:

- tapping `Skip for now` immediately sends the user into the app
- onboarding is not marked complete
- the tutorial remains available in `Profile > Help`
- onboarding auto-opens again on a later sign-in until the user completes it once

### Persistence Rule For Skip

Do not add a server-side skipped flag in this iteration.

Instead:

- use a frontend session-only dismissal flag
- the flag suppresses the onboarding redirect only for the current signed-in session
- once the session ends or the user signs in again later, incomplete onboarding should auto-open again

This keeps state minimal while matching the approved behavior.

## Help Hub Design

Add a dedicated help hub reachable from `Profile > Help`.

### Help Hub Structure

The hub should show separate cards:

- `Inspect Demo`
- `History Demo`
- `Safety Reminder`
- `Profile Walkthrough`

Each card opens its own short guided tutorial instead of forcing the full onboarding sequence again.

### Help Hub Rules

- always available to inspectors, regardless of onboarding completion state
- replayable any number of times
- safe to open because all flows remain simulated
- does not write onboarding completion unless the user is in first-run onboarding mode and finishes the required sequence there

The help hub should feel like a destination, not an afterthought in the profile form.

## UI Direction

The tutorial must look like a polished in-app coach.

### Tutorial Shell

- full-screen route
- no bottom navigation behind the tutorial
- centered simulated phone/app canvas
- dimmed overlay around the fake screen
- one bright highlighted hotspot at a time
- compact instruction panel near the bottom
- clear step label such as `Inspect Demo 2 of 4`
- visible `Skip for now`

### Motion

Use restrained motion only:

- fade overlay transitions
- gentle hotspot pulse
- short instruction-card transitions

Avoid noisy animation or a theatrical marketing style.

### Visual Tone

- clean and product-like
- aligned with the existing MeatLens palette
- rounded surfaces and crisp hierarchy
- more like a finance-app coach than a slide deck

## Data And Persistence Model

Keep the existing profile persistence model:

- `onboarding_completed_at TIMESTAMPTZ NULL`
- `onboarding_version INTEGER NOT NULL DEFAULT 1`

### Rules

- `onboarding_completed_at IS NULL` means incomplete
- non-null `onboarding_completed_at` means first-run onboarding is complete
- `onboarding_version` remains the future reset lever if tutorial content changes materially

### Additional Persistence

Add frontend-only session state for:

- `skipped this session`

Do not add new server-side skip columns unless implementation uncovers a hard cross-device requirement.

## Implementation Structure

Implementation should stay config-driven rather than hardcoding the entire experience inside one page component.

### Recommended Structure

- keep `/onboarding` as the first-run route
- add a dedicated help hub page
- extract tutorial definitions into reusable config objects
- build one tutorial engine that supports:
  - onboarding mode
  - help replay mode

### Tutorial Definition Shape

Each tutorial should define:

- id
- title
- summary
- simulated screen layout
- ordered hotspots
- completion copy
- whether it is required in first-run onboarding

This keeps the tutorials maintainable and allows later expansion without turning the page into a large conditional tree.

## Error Handling

- If auth or profile state is unresolved, keep the existing blocking loading behavior.
- If profile load fails, keep the existing retry screen and fail closed.
- If onboarding completion write fails at the end of first-run onboarding, keep the user on the completion screen and show the real error.
- If the user skips midway, do not persist partial completion.
- If a completed user replays demos from Help, never alter onboarding completion state.

## Testing Strategy

Update and add tests for both onboarding and the new help surface.

### Core Onboarding Tests

- first-time inspector auto-opens onboarding
- `Skip for now` allows access during the current session
- skipped inspector is prompted again on a later sign-in
- completed inspectors bypass onboarding
- admins bypass onboarding
- completion writes `onboarding_completed_at`
- completion write failure keeps the user on the completion state with an error
- profile-load failure still shows the retry screen

### Help Hub Tests

- `Profile > Help` is visible for inspectors
- help hub opens successfully
- each tutorial card launches independently
- help demos are replayable
- help demos do not write onboarding completion

### Manual Verification

- the strict guided taps feel obvious on mobile
- the simulated screens are visually clear enough to teach the feature
- `Skip for now` is easy to find
- the help hub feels like part of the product, not a leftover onboarding artifact

## Risks And Mitigations

- Risk: the simulated screens become visually disconnected from the real app.
  Mitigation: mirror the real app structure, labels, and hierarchy closely even though the screens are fake.

- Risk: skip behavior becomes confusing if it suppresses onboarding forever.
  Mitigation: keep skip session-only and completion server-persisted.

- Risk: the tutorial engine grows rigid or repetitive.
  Mitigation: define demos through shared configuration and reusable hotspot primitives.

- Risk: help replay accidentally mutates onboarding completion.
  Mitigation: separate onboarding completion writes from help replay mode at the controller level.

## Acceptance Criteria

- First-time non-admin inspectors are auto-routed to `/onboarding` after sign-in.
- The onboarding experience is a visible simulated tutorial, not a simple card wizard.
- The tutorial uses strict guided taps with one active highlighted target at a time.
- Required first-run sections are Safety, Profile Walkthrough, Inspect Demo, and History Demo.
- The profile step is simulated only and does not edit real account data.
- `Skip for now` lets the user enter the app immediately for the current session.
- Skipping does not mark onboarding complete.
- Incomplete inspectors are auto-prompted again on a later sign-in until they complete onboarding once.
- Completing first-run onboarding persists `onboarding_completed_at`.
- Inspectors can reopen tutorials later from `Profile > Help`.
- The help hub provides separate replay cards for `Inspect Demo`, `History Demo`, `Safety Reminder`, and `Profile Walkthrough`.
- Help replays do not alter onboarding completion state.
- Admins bypass the inspector tutorial system entirely.
