# Mobile Messages List-First Design

Date: 2026-07-02
Status: Approved for implementation

## Summary

Refactor the `/messages` page so mobile behaves like a list-first messaging app: users should initially see only the messages list, and the conversation view should appear only after tapping a contact. The existing desktop split layout remains unchanged. The refactor stays entirely within the current route and current frontend API contract.

## Goals

- Make mobile open on the contact list screen instead of showing a conversation immediately.
- Keep the existing summary header visible on the mobile list screen.
- Load a conversation on mobile only after the user taps a contact.
- Keep the thread back action as local in-page state instead of route history.
- Preserve the existing desktop behavior and layout.
- Avoid unnecessary mobile message fetches when no conversation is selected.

## Non-Goals

- Adding a new route such as `/messages/:contactId`.
- Changing backend chat APIs, payloads, or polling intervals.
- Redesigning the desktop messages page.
- Changing the visual language of the current cards beyond responsive layout needs.
- Implementing deep-linkable conversation state on mobile.

## Existing System Context

The current messages feature is composed from:

- `frontend/src/pages/MessagesPage.tsx`
- `frontend/src/pages/user/messages/hooks/useMessagesPage.ts`
- `frontend/src/pages/user/messages/components/MessagesHeader.tsx`
- `frontend/src/pages/user/messages/components/ContactsPanel.tsx`
- `frontend/src/pages/user/messages/components/ThreadPanel.tsx`
- `frontend/src/integrations/api/UserChatClient.ts`

Today, the page works like this:

- `useMessagesPage` loads contacts on mount.
- When contacts load, `selectedContactId` falls back to the first contact if the previous selection is no longer valid.
- The message-loading effect runs whenever `selectedContactId` is set.
- Desktop and mobile both share the same selected-contact state.
- Mobile uses `mobilePanel` to switch between `"contacts"` and `"thread"`, but the first contact is still auto-selected in the background.
- Because of that auto-selection, the first thread loads even before the mobile user explicitly opens a conversation.

The new design keeps the current panel architecture but changes how selection is initialized and recovered on mobile.

## Approved Product Rules

The following rules were explicitly approved during design:

- Mobile navigation remains local in-page state only.
- Browser or device back should not become conversation history for this feature.
- Mobile should not auto-select a contact on first load.
- Mobile should not load a thread until the user taps a contact.
- The summary header remains visible on the mobile list screen.
- Desktop should keep its existing split view and initial first-contact selection behavior.

## UX Design

### Mobile List Screen

The initial mobile `/messages` view should contain:

1. `MessagesHeader`
2. `ContactsPanel`

Behavior:

- No conversation is selected by default.
- The contact list remains searchable and refreshable as it is today.
- Tapping a contact opens that contact's conversation and switches the mobile panel to thread view.

### Mobile Thread Screen

When a mobile user taps a contact, the page should switch to a dedicated thread screen containing:

1. `ThreadPanel`

Behavior:

- The selected contact name and existing message history render exactly as they do today.
- The current back button in `ThreadPanel` returns to the contact list screen.
- Returning to the list should not change the route.
- While the thread is open, the summary header and contacts panel are not shown.

### Desktop Layout

Desktop continues to render the current two-panel layout:

- `ContactsPanel`
- `ThreadPanel`

Desktop should continue to:

- select the first available contact when needed
- load that thread automatically
- show both panels at the same time

No desktop route or layout changes are required.

## Responsive State Design

### Selection Rules

`selectedContactId` becomes viewport-aware in `useMessagesPage`:

- On desktop:
  - if the existing selection is still present after a contacts refresh, keep it
  - otherwise fall back to the first available contact
- On mobile:
  - if the existing selection is still present after a contacts refresh, keep it
  - otherwise clear the selection to `null`

This preserves the current desktop experience while allowing mobile to stay truly list-first.

### Panel Rules

The current `mobilePanel` state remains the mechanism for mobile navigation:

- initial mobile state: `"contacts"`
- when a user taps a contact: set `selectedContactId` and switch to `"thread"`
- when a mobile user taps back: switch to `"contacts"`

No route state, query param, or history state should be introduced.

### Polling Rules

Contacts polling remains active as it is today.

Message polling should only run when `selectedContactId` exists. This ensures:

- desktop keeps its current live-thread polling behavior
- mobile does not poll an unseen thread before the user selects one

## Data Flow

No backend data model or API change is required.

Existing data flow remains the source of truth:

- `userChatClient.getContacts()`
- `userChatClient.getMessages(counterpartyId)`
- `userChatClient.sendMessage(recipientId, content)`

Frontend state responsibilities remain in `useMessagesPage`:

- contacts list
- selected contact id
- loaded messages for the selected contact
- draft message
- contact search
- mobile panel state

The only behavioral change is when `selectedContactId` is set or cleared on mobile.

## Error Handling

Existing error behavior should be preserved:

- contact load failures continue to show the current error toast
- message load failures continue to show the current error toast
- send failures continue to restore the draft and show the current error toast

State recovery rules:

- if no mobile contact is selected, the thread should not render and no message request should run
- if a selected contact disappears after a refresh on mobile, clear the selection, clear thread messages, and return to the list screen
- if a selected contact disappears after a refresh on desktop, fall back to the first available contact as today

## Accessibility And Interaction Notes

- The contact list remains the first interactive surface on mobile.
- The mobile back button remains visible only when the thread screen is open.
- Mobile DOM order should match the visible order so screen readers encounter the list screen before any thread content.
- Search, refresh, send, and back controls should keep their current button semantics and labels.

## Testing Strategy

### Frontend Coverage

Add or update frontend coverage so it verifies:

- mobile initial load renders the messages header and contacts list without opening a thread
- mobile initial load does not auto-select the first contact
- mobile tapping a contact opens the thread view
- mobile thread back returns to the list view
- desktop still auto-selects and renders the first available conversation

### Regression Expectations

Existing behavior that must continue working:

- contact search filtering
- contact refresh action
- thread loading for the selected contact
- sending a message
- automatic scroll-to-latest-message behavior
- desktop dual-panel layout

Where practical, use a focused component or hook-level test for the viewport-aware state behavior plus a higher-level UI test for the mobile list-to-thread transition.

## Files Expected To Change

Likely areas of change:

- `frontend/src/pages/MessagesPage.tsx`
- `frontend/src/pages/user/messages/hooks/useMessagesPage.ts`
- possible small updates in:
  - `frontend/src/pages/user/messages/components/ContactsPanel.tsx`
  - `frontend/src/pages/user/messages/components/ThreadPanel.tsx`
- new or updated frontend tests covering mobile and desktop message-page behavior

## Implementation Notes

- Prefer the smallest coherent refactor that keeps the existing messages feature structure understandable.
- Keep the current route and current API client intact.
- Do not hide mobile behavior behind desktop-first defaults that still eagerly select a thread.
- If testability is awkward with the current hook shape, a small extraction for selection-state rules is acceptable, but avoid broader refactoring unrelated to the mobile-only behavior change.
