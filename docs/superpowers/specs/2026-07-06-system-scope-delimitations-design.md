# System Scope And Delimitations Design

Date: 2026-07-06
Status: Approved for planning

## Summary

Add a clear in-app definition of MeatLens system scope and delimitations for inspectors. The app should present a compact scope reminder directly in the `Inspect` workflow and a fuller reference page under `Profile > Help`. Both surfaces must communicate the same approved boundaries: the current system is for pork inspection support only, works as field screening support only, does not replace laboratory diagnosis, does not act as a legal certification tool, and is not validated for beef, poultry, fish, or other meat categories.

The goal is not to add new inspection logic. The goal is to reduce misuse by making the product boundaries visible at the moment of inspection and permanently revisit-able from the existing help area.

## Goals

- Define the current system scope inside the authenticated inspector app.
- State the operational delimitations inspectors must understand before relying on the AI result.
- Make `pork only` an explicit product boundary.
- Explain that MeatLens supports field screening and does not replace official inspector judgment.
- Provide a concise reminder in the `Inspect` page and a fuller reference in `Profile > Help`.
- Keep the wording consistent across both surfaces through shared frontend content.
- Ship the change without backend or database work.

## Non-Goals

- Expanding the model to support beef, poultry, fish, or other meat types.
- Changing model behavior, confidence logic, or classification outputs.
- Introducing user acknowledgement persistence or a new compliance audit flow.
- Reworking onboarding or the existing tutorial replay engine for this iteration.
- Adding admin-only scope management, CMS editing, or server-configured legal text.

## Current Context

The current app already has:

- a protected `Inspect` route composed in `frontend/src/pages/user/inspections/components/InspectPageView.tsx`
- a `Pre-Scan Safety Protocol` section that already introduces operational guidance before capture
- a protected help hub at `/profile/help`
- help cards and help routing driven by `frontend/src/lib/tutorials/tutorialDefinitions.ts`
- an existing inspector-facing tutorial and safety language pattern under `Profile > Help`

Today, inspectors can access workflow guidance and simulated demos, but there is no dedicated product boundary reference that clearly answers:

- what MeatLens is for
- what MeatLens is not for
- which meat type is currently in scope
- when the inspector must rely on official procedure instead of the AI result

## Approved Product Direction

Use a dual-layer guidance model:

1. `Inline inspect reminder`
   A compact scope and delimitations card appears in the `Inspect` page near the pre-scan stage so the boundary is visible during real use.

2. `Full help reference`
   A dedicated `Scope and Delimitations` entry appears in `Profile > Help` and opens a full reference page inspectors can revisit any time.

This keeps the high-value reminder close to the workflow while preserving a durable in-app source of truth.

## Information Architecture

### New Surface In Help

Add a new help entry titled `Scope and Delimitations` to the existing help hub.

This entry should not launch the replay-style tutorial player. Instead, it should navigate to a normal protected content route that behaves like a reference page.

### New Protected Route

Add a new protected route:

- `/profile/help/scope`

This route should be directly revisit-able from both:

- the help hub card
- the inline scope reminder on the `Inspect` page

### Inspect Page Placement

Add the compact scope reminder to the `Inspect` page in a prominent but non-blocking position. Approved placement is above or immediately adjacent to the pre-scan section so the inspector sees the boundary before continuing through capture and analysis.

The reminder should remain visible as product guidance, not as a dismissible marketing banner.

## Shared Content Model

The inspect reminder and full help reference must draw from one shared frontend content source so the wording cannot drift over time.

### Recommended Shared Structure

Create a shared content module that defines:

- page title
- inspect summary title
- inspect summary description
- inspect summary bullets
- full reference section titles
- full reference section body copy
- CTA labels such as `View full scope and delimitations`

This is a static content concern. No API or backend source is required.

## Content Requirements

The content must state both system scope and operational delimitations at the same level.

### Required Scope Statements

The shared content must explicitly communicate:

- the current system is intended for `pork` inspection support only
- the supported use case is inspector field screening within the MeatLens workflow
- the app is not yet intended for beef, poultry, fish, or other meat categories

### Required Operational Delimitations

The shared content must explicitly communicate:

- MeatLens is a decision-support tool only
- MeatLens is not a laboratory diagnosis
- MeatLens is not a legal certification tool
- final inspection judgment remains with the inspector under official protocol
- the AI result should not be treated as the only basis for enforcement action

### Required Exclusion Guidance

The full reference must also explain when inspectors should avoid over-relying on the system, including cases such as:

- non-pork samples
- cases requiring laboratory confirmation
- situations where official LGU or institutional procedure requires manual judgment regardless of AI output
- scenarios outside the validated workflow of capture, analysis, review, and inspection documentation

## Inspect Reminder UX

The inline inspect reminder should answer the question `Can I use MeatLens for this inspection?` in a few seconds.

### Reminder Content Shape

The compact reminder should include:

- a short title such as `Scope and Delimitations`
- one sentence describing the tool as pork-only field screening support
- a short bullet list of critical exclusions
- a CTA linking to the full help reference page

### Required Compact Points

The compact reminder should cover these points at minimum:

- `Pork samples only`
- `Field screening support only`
- `Not a lab diagnosis`
- `Not a legal certification tool`
- `Final decision stays with the inspector`

### Behavior

- the card is always visible in inspect mode
- it does not block workflow completion
- it does not require a checkbox or acknowledgement in this iteration
- tapping the CTA opens `/profile/help/scope`

## Full Help Reference UX

The full page should behave as a readable reference page, not as a guided simulation.

### Page Sections

The full page should include these sections:

1. `System scope`
   Define the current intended coverage as pork-only inspection support.

2. `Included workflow`
   Explain the intended use inside MeatLens: field capture, AI-assisted freshness review, and inspector documentation.

3. `Excluded meat types and cases`
   State that beef, poultry, fish, and other categories are out of scope in the current version.

4. `Operational delimitations`
   Explain that MeatLens is not a lab diagnosis and not a legal certification authority.

5. `Inspector responsibilities`
   State that official judgment and protocol remain with the inspector.

6. `When not to rely on the AI result alone`
   Clarify situations where manual or formal procedure must take precedence.

### Page Behavior

- accessible from the help hub and the inspect reminder
- protected like other inspector help routes
- no replay engine, simulated screen, or tutorial stepper
- readable on mobile and desktop

## Help Hub Integration

The existing help hub should gain a new card for the reference page without disturbing the current tutorial cards.

### Help Card Rules

- title: `Scope and Delimitations`
- description should clearly signal that this is a product-boundary reference, not a replay tutorial
- selecting the card should navigate directly to `/profile/help/scope`
- tutorial cards should continue opening the replay flow unchanged

This means the help hub will support two entry types:

- tutorial replay cards
- static reference cards

## Routing And View Model Impact

### Route Changes

Add one new protected route:

- `/profile/help/scope`

### Help View Model Changes

The current help page model assumes cards open tutorials by `TutorialId`. This design requires a small extension so the help hub can support mixed card actions:

- tutorial replay action
- direct route navigation action

Implementation can achieve this either by:

- extending the help card model to include an action type, or
- keeping the existing tutorial card set and rendering the scope reference card separately in the help page view model

Either implementation is acceptable as long as the UI stays clear and the static reference does not get forced through the tutorial-player abstraction.

## Accessibility And Copy Rules

- use clear, non-legalistic wording suitable for inspectors in active field work
- keep the compact inspect version scannable in under ten seconds
- preserve explicit terms like `pork only`, `not a lab diagnosis`, and `not a legal certification tool`
- ensure all navigation actions have clear button or link labels
- keep heading hierarchy valid on the full page for screen-reader use

## Testing Strategy

### Frontend Route And Rendering Coverage

- the help hub shows a `Scope and Delimitations` entry
- selecting the help entry opens `/profile/help/scope`
- the full page renders the required boundary headings and copy
- the inspect page shows the compact scope reminder
- the inspect CTA opens the full scope page

### Content Regression Coverage

Tests should assert the presence of the most important boundary phrases so later copy edits do not silently remove them:

- `pork`
- `not a lab diagnosis`
- `not a legal certification tool`
- `final decision` or equivalent inspector-responsibility language
- at least one out-of-scope non-pork meat category such as `beef` or `poultry`

### Manual Verification

- confirm the inspect reminder is visible without crowding the pre-scan section
- confirm the full page reads well on small mobile screens
- confirm help hub behavior remains obvious when mixing tutorial and reference entries

## Risks And Mitigations

- Risk: scope wording drifts between Inspect and Help.
  Mitigation: keep both surfaces bound to one shared content module.

- Risk: the new help entry gets forced into the tutorial-player architecture and feels wrong.
  Mitigation: route the scope entry to a normal page, not the replay engine.

- Risk: inspectors overlook the product boundary during live inspections.
  Mitigation: place the compact reminder directly in the inspect workflow near pre-scan.

- Risk: long-form copy becomes too verbose for practical use.
  Mitigation: keep the inspect version short and reserve detail for the dedicated help page.

## Acceptance Criteria

- Inspectors can find a `Scope and Delimitations` reference from `Profile > Help`.
- The help entry opens a dedicated protected reference page rather than the replay tutorial player.
- The `Inspect` page shows a compact, always-visible scope reminder.
- The compact reminder clearly states that the current system is for pork inspection support only.
- The compact reminder clearly states that MeatLens is field screening support only.
- The compact reminder clearly states that MeatLens is not a lab diagnosis and not a legal certification tool.
- The full reference page clearly states that beef, poultry, fish, and other non-pork categories are out of scope.
- The full reference page clearly states that final official judgment remains with the inspector.
- Both surfaces use shared source content so the same boundaries are communicated consistently.
- No backend, database, or model changes are required for this feature.
