# Inspector Tutorial Parity Design

## Context

MeatLens now has a broader inspector workflow than the original tutorial mockups: inspection scope and pre-scan safety protocol, manual market selection with optional GPS, model readiness and local analysis, richer result review, saved history, profile settings, help replays, and online-only messaging. The tutorial currently renders a simplified phone UI and its page can trap vertical scrolling on mobile.

The problem in one sentence: inspectors need to learn the current product through the same app surfaces they will operate, without losing the existing guided phone-and-instruction flow on small screens.

## Visual direction

The tutorial keeps the existing product’s industrial utility direction: dark neutral surfaces, JetBrains Mono display labels, the existing Inter body font for parity, green action states, amber safety states, rounded card geometry, and the app’s current border and shadow language. The memorable move is a literal product mirror: a highlighted action appears inside the same phone surface and the instruction card explains only that action.

The app surface is the source of truth. Tutorial-only styling is limited to the player header, progress dots, hotspot treatment, instruction copy, and completion actions.

## User flow

The existing flow remains sequential and tap-driven:

1. Safety acknowledgement.
2. Profile account details, access code, and help entry.
3. Inspect scope and pre-scan safety protocol.
4. Manual market selection and capture station.
5. Model readiness, offline analysis availability, and analysis output.
6. Save result and review it in History.
7. Open Messages to understand contact directory, conversation thread, connection state, and offline pause behavior.
8. Finish onboarding or return to Help/Profile for replay.

Focused Help replays use the same scenes and exact app labels. They do not write account state.

## Architecture

The tutorial player remains responsible for ordered steps, progress, skip, completion, and route callbacks. Tutorial scenes remain deterministic and local, but their phone surfaces are composed from shared presentation primitives that match the live app’s current sections and navigation. The scene fixture layer supplies sample data explicitly marked as simulated; no tutorial action calls production APIs, opens a real camera, or mutates an account.

The phone frame becomes a flex column with a dedicated scrollable content region and a non-scrolling bottom navigation region. On mobile, the outer tutorial page uses normal document flow and safe-area-aware bottom padding so a vertical swipe can reach the instruction card and completion actions.

## Accessibility and behavior

- Every highlighted hotspot remains a real button with an accessible name.
- Progress exposes the current step in text as well as visual dots.
- The app surface keeps visible focus rings and does not depend on color alone.
- The phone content can scroll independently when a scene is taller than the frame; the phone navbar remains pinned.
- The outer tutorial document remains vertically scrollable on mobile.
- Reduced-motion users receive no pulsing hotspot animation.
- Tutorial fixtures are labeled as simulated in copy where data could otherwise look real.

## Verification

The affected frontend gates are lint, typecheck, tutorial unit/component tests, architecture/source-size checks, and the onboarding/help Playwright journeys. A dedicated Playwright regression will verify that a mobile tutorial route has a scrollable document and that its bottom navbar remains visible at the phone frame’s bottom while the inner scene scrolls.

