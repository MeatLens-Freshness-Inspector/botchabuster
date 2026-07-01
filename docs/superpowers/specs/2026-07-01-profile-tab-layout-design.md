# Profile Tab Layout Design

Date: 2026-07-01
Status: Approved for implementation

## Summary

Reorganize the profile tab so the editable `Detailed Information` card becomes the home for profile `name` and `email`, replacing the separate profile edit card. Keep the existing profile summary card at the top. Reorder the remaining profile sections so mobile shows a single approved stack order, while desktop splits those same sections into the approved left and right columns.

## Goals

- Make `Detailed Information` the editable profile card for `name` and `email`.
- Remove the standalone profile edit/save card from the right-side settings column.
- Keep the current behavior of `Password`, `Passkey`, `Tutorials`, `Actions`, `TAC`, and `Policy` while changing their placement.
- Match the approved responsive arrangement exactly on both mobile and desktop.
- Limit the scope to the profile tab layout and profile-card editing behavior.

## Non-Goals

- Changing the top profile summary card placement or purpose.
- Redesigning passkey, password, tutorial, actions, terms, or privacy interactions.
- Merging legal cards or changing dialog content.
- Adding new editable profile fields beyond `name` and `email`.
- Changing backend profile storage or API contracts unless existing frontend wiring already requires them.

## Existing System Context

The current profile page is composed from:

- `frontend/src/pages/user/profile/components/ProfilePageView.tsx`
- `frontend/src/pages/user/profile/components/ProfileOverviewColumn.tsx`
- `frontend/src/pages/user/profile/components/ProfileSettingsColumn.tsx`
- `frontend/src/pages/user/profile/hooks/useProfilePage.ts`
- `frontend/test/profile-page.spec.ts`

Today, the page behaves like this:

- `ProfilePageView` renders a two-column layout on desktop.
- `ProfileOverviewColumn` currently owns:
  - profile summary
  - `Detailed Information`
  - `Terms and Conditions Reminder`
  - `Privacy Policy`
  - `Tutorials`
- `ProfileSettingsColumn` currently owns:
  - editable `name` and `email` form plus `Save Profile`
  - `Password Reset Section`
  - `Actions`
  - `Passkeys and Device Unlock`

The new design only changes which component owns each section and the order those sections render in responsive layouts.

## Approved Product Rules

The following rules were explicitly approved during design:

- The top profile summary card stays in place.
- `Detailed Information` becomes the editable card for `name` and `email`.
- The separate profile edit/save card is removed.
- Mobile section order must be:
  1. `Detailed Information`
  2. `Password`
  3. `Passkey`
  4. `Tutorials`
  5. `Actions`
  6. `TAC`
  7. `Policy`
- Desktop section grouping must be:
  - left: `Detailed Information`, `Password`, `Passkey`, `Tutorials`
  - right: `Actions`, `TAC`, `Policy`

## UX Design

### Global Page Structure

The page keeps the current top-level shell:

- profile page header
- profile summary card at the top of the content area
- responsive lower content area containing the remaining section cards

The profile summary card is not part of the regrouping request and should remain visually unchanged unless minor spacing adjustments are required to support the new section layout.

### Detailed Information Card

`Detailed Information` changes from a read-only summary card into the primary editable profile information card.

It should contain:

- editable `name` input
- editable `email` input
- current non-editable informational rows that still belong in profile details
  - inspector code
  - theme
  - inspect result detail preference summary
- a `Save Profile` action inside the same card

Behavior:

- editing `name` and `email` continues using the existing profile save flow
- save behavior, toasts, and validation rules remain aligned with current `handleSaveProfile`
- non-editable rows keep their current displayed values

### Password Card

`Password Reset Section` remains functionally the same but moves into the left-side stack after `Detailed Information`.

### Passkey Card

`Passkeys and Device Unlock` remains functionally the same but moves into the left-side stack after `Password`.

### Tutorials Card

`Tutorials` remains functionally the same but moves into the left-side stack after `Passkey`.

### Actions Card

`Actions` remains functionally the same and belongs in the right-side stack on desktop. On mobile it appears after `Tutorials`.

### Terms And Conditions Card

The existing `Terms and Conditions Reminder` card remains a separate card and moves into the right-side stack after `Actions`.

### Privacy Policy Card

The existing `Privacy Policy` card remains a separate card and moves into the right-side stack after `TAC`.

## Responsive Layout Rules

### Mobile

Mobile renders the lower profile content as a single vertical stack in this order:

1. `Detailed Information`
2. `Password`
3. `Passkey`
4. `Tutorials`
5. `Actions`
6. `TAC`
7. `Policy`

Including the unchanged top profile summary card, the full mobile flow becomes:

1. profile summary
2. `Detailed Information`
3. `Password`
4. `Passkey`
5. `Tutorials`
6. `Actions`
7. `TAC`
8. `Policy`

### Desktop

Desktop keeps a two-column lower layout beneath the unchanged top profile summary card.

Left column order:

1. `Detailed Information`
2. `Password`
3. `Passkey`
4. `Tutorials`

Right column order:

1. `Actions`
2. `TAC`
3. `Policy`

The left column may be taller than the right. This imbalance is acceptable because the approved requirement prioritizes grouping correctness over equal column height.

## Component Design

### `ProfilePageView`

`ProfilePageView` should continue to own the page shell and decide the high-level layout.

Recommended structural change:

- keep the top profile summary card rendered before the lower section grid
- replace the current two-component split (`ProfileOverviewColumn` and `ProfileSettingsColumn`) with lower layout responsibilities that reflect the new grouping

This can be implemented in one of two acceptable ways:

- keep the existing two column components but redistribute section ownership
- introduce new lower-section group components if that produces clearer boundaries

The preferred direction is the smallest coherent refactor that keeps file responsibilities understandable.

### `ProfileOverviewColumn`

This component should be narrowed to the top profile summary card only, unless the implementation chooses to rename or replace it with a more accurate summary-focused component.

### `ProfileSettingsColumn`

This component should no longer contain the separate profile edit card. Its remaining ownership should be revisited so the final boundaries reflect the approved left/right grouping rather than the old "settings" concept.

### Editable Detailed Information Extraction

If the existing `Detailed Information` section becomes significantly more complex, it should be extracted into a focused component rather than overloading a large mixed-responsibility file.

Good boundary candidates include:

- `ProfileEditableDetailsCard`
- `ProfileSecurityCard`
- `ProfileActionsCard`
- `ProfileLegalCard` variants when composition helps readability

The exact extraction is an implementation detail, but the end result should keep files easy to understand and test.

## Data Flow

No new backend data is required for this change.

Existing frontend state and handlers remain the source of truth:

- `fullName`
- `email`
- `isSavingProfile`
- `setFullName`
- `setEmail`
- `handleSaveProfile`

The updated `Detailed Information` card should consume those existing values and actions directly.

Passkey, password, inspect-preference, theme, sign-out, terms, privacy, and tutorial flows should keep using their existing handlers unchanged.

## Error Handling

The change should preserve current failure behavior rather than invent new patterns:

- save failures for `name` or `email` continue to surface through the existing toast path
- disabled states for `Save Profile` continue to respect active save/upload state
- password and passkey errors remain isolated to their own cards
- terms and privacy dialogs continue using the existing dialog state

Because this is a layout refactor plus card ownership change, preserving existing action wiring is more important than introducing new UI states.

## Accessibility And Interaction Notes

- Input labels for editable `name` and `email` must remain explicit and associated with their fields.
- The relocated `Save Profile` action must remain keyboard accessible.
- Section headings should stay semantically clear after the regrouping.
- Responsive order changes must still produce a logical reading order in the DOM for mobile users.

## Testing Strategy

### Frontend Coverage

Add or update profile page coverage so it verifies:

- the page still loads successfully
- editable `name` and `email` controls render inside `Detailed Information`
- the separate profile edit card no longer renders
- desktop grouping renders `Detailed Information`, `Password`, `Passkey`, and `Tutorials` in the left stack
- desktop grouping renders `Actions`, `TAC`, and `Policy` in the right stack
- mobile order follows the approved single-column sequence

### Regression Expectations

Existing behaviors that must keep working:

- saving profile `name`
- updating profile `email`
- updating password
- passkey enrollment and removal
- detailed inspect-result preference toggle
- theme toggle
- sign out confirmation
- terms dialog opening
- privacy dialog opening
- tutorial navigation actions

Where full end-to-end layout assertions are awkward, tests may combine:

- targeted Playwright coverage for visible section order and key controls
- focused component-level assertions if there is an existing frontend unit-test setup available for this page

## Files Expected To Change

Likely areas of change:

- `frontend/src/pages/user/profile/components/ProfilePageView.tsx`
- `frontend/src/pages/user/profile/components/ProfileOverviewColumn.tsx`
- `frontend/src/pages/user/profile/components/ProfileSettingsColumn.tsx`
- possible new profile card/group components under `frontend/src/pages/user/profile/components/`
- `frontend/test/profile-page.spec.ts`

## Implementation Notes

- Prefer a small refactor that improves component boundaries while applying the approved regrouping.
- Avoid leaving misleading component names in place if their responsibilities change substantially.
- Preserve the current visual language and card styling unless small spacing changes are needed to support the new grouping.
