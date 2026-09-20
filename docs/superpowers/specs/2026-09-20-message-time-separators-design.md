# Message Time Separators Design

## Context

MeatLens user conversations currently render every message with its own timestamp, but the thread has no visual marker when a later message arrives after a long pause. The requested behavior is Messenger-like time separation using a 30-minute threshold while preserving each message's existing timestamp.

## Chosen design

Render a time separator immediately before the first message in a conversation and before every later message whose timestamp is at least 30 minutes after the preceding message. The separator is additive: message bubbles, sender alignment, ordering, and per-message timestamps remain unchanged.

The separator will be a small accessible `role="separator"` row with a 1px horizontal rule and the existing formatted timestamp as its label. The visual language is deliberately restrained and grid-like: a hairline rule and left-aligned time label create a quiet pause without introducing new colors, icons, or fabricated copy. The separator uses the existing message panel tokens rather than changing the surrounding messaging surface.

## Behavior rules

- The first message in a non-empty conversation always receives a separator so the thread has a clear starting time.
- A later message receives a separator when `current.created_at - previous.created_at >= 30 minutes`.
- Messages less than 30 minutes apart do not receive a separator.
- The comparison uses parsed timestamps in milliseconds and preserves the input order supplied by the conversation model.
- Existing per-message timestamps remain visible on every message.
- Empty, loading, and no-contact states are unchanged.
- The separator label uses `formatTimestamp` so locale and timezone behavior remain centralized in the existing formatter.

## Component/data flow

`ThreadPanel` will continue to own message rendering. A small pure helper in the messaging feature model will expose the threshold and decision logic so the boundary can be tested independently. The panel will call that helper while mapping messages and render the separator before the qualifying message.

No backend, persistence, API, or message type changes are required. The feature is presentation-only and applies equally to loaded and real-time messages because both already flow through the same `messages` prop.

## Testing

- Add unit coverage for timestamps 29 minutes apart, exactly 30 minutes apart, and 31 minutes apart.
- Add a component render test proving a qualifying message produces a separator while the existing per-message timestamps still render.
- Run the focused frontend tests first, then frontend lint, typecheck, and the complete frontend unit/component/integration lanes required by CI.

## Out of scope

- Changing the per-message timestamp format.
- Grouping bubbles by sender or changing avatars/name display.
- Persisting separator metadata.
- Modifying backend chat behavior or API contracts.
