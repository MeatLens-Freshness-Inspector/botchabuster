# Inspector Tutorial Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the inspector tutorial use current app UI parity, cover current inspector features across Inspect, History, Messages, and Profile, and remain scrollable on mobile while preserving the existing guided phone flow.

**Architecture:** Keep `TutorialPlayer` as the sequential flow controller. Replace approximate scene internals with deterministic presentation components that use the same app copy, spacing, card classes, states, and navigation order as the live inspector surfaces. Split the phone frame into a scrollable content region and a pinned bottom navigation region, and test the behavior through unit/component and Playwright coverage.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, lucide-react, Node test runner via tsx, Playwright.

## Global Constraints

- Keep the existing tutorial journey: sequential tap hotspots, step counter, skip action, completion actions, and Help replay behavior.
- Inspector-only scope: do not add admin/developer tutorials.
- Use current app labels and UI hierarchy; tutorial-only copy must identify simulated data.
- No production API writes, camera permissions, or account mutation from tutorial scenes.
- Mobile document scrolling must remain available; phone bottom navigation must remain pinned inside the phone frame.
- Preserve existing test coverage and do not use focused or skipped tests.
- Every implementation commit must be non-empty and touch at least two files.
- Complete at least 20 coherent commits.
- Run affected checks after each implementation slice and the full relevant frontend gate before completion.

## Commit map

1. Commit the design and implementation plan.
2. Add tutorial feature IDs and fixture contracts with model tests.
3. Add a shared tutorial app shell contract and shell tests.
4. Add phone-frame scroll-region behavior and mobile layout regression tests.
5. Align tutorial bottom navigation with the live inspector tab order and test it.
6. Refresh safety/scope scene copy and visual structure with scene tests.
7. Refresh profile scene for account details, passkeys, preferences, and tutorial entry points.
8. Add current Inspect hero and scope presentation fixtures.
9. Add pre-scan safety protocol scene coverage.
10. Add capture station, market selection, GPS copy, and model readiness coverage.
11. Add current analysis output and protocol-result coverage.
12. Refresh History list and detail scene coverage.
13. Add Messages contact directory and conversation thread coverage.
14. Add offline and connection-state tutorial fixtures and tests.
15. Wire all refreshed scenes through `TutorialScene` and the model order.
16. Refine player progress, accessible hotspot labels, reduced motion, and safe-area spacing.
17. Update Profile Help cards and replay content for the expanded inspector library.
18. Update onboarding/help Playwright journey helpers and assertions.
19. Add mobile Playwright regression coverage for outer scrolling and pinned phone navigation.
20. Run architecture/source-size/full frontend checks, update relevant documentation, and commit the verified handoff.

## Files and responsibilities

- `frontend/src/features/tutorials/model/inspection-tutorial.ts`: ordered tutorial definitions and feature IDs.
- `frontend/src/features/tutorials/model/tutorial-fixtures.ts`: deterministic, explicitly simulated app-state values.
- `frontend/src/features/tutorials/ui/tutorial-player.tsx`: player flow and mobile-safe outer layout.
- `frontend/src/features/tutorials/ui/mock-phone-frame.tsx`: phone frame scroll contract and pinned navbar slot.
- `frontend/src/features/tutorials/ui/tutorial-app-shell.tsx`: shared simulated app header/content/navigation shell.
- `frontend/src/features/tutorials/ui/tutorial-scene.tsx`: scene dispatch.
- `frontend/src/features/tutorials/ui/scenes/*.tsx`: feature-specific app-parity surfaces.
- `frontend/src/features/tutorials/ui/mock-hotspot.tsx`: accessible highlighted controls.
- `frontend/src/features/tutorials/ui/profile-help-page-view.tsx`: Help library entries.
- `frontend/tests/unit/features/tutorials/*.test.tsx` and `.test.ts`: model, shell, scene, and player contracts.
- `frontend/tests/e2e/journeys/inspector/inspector-onboarding.e2e.spec.ts`: sequential onboarding journey.
- `frontend/tests/e2e/journeys/inspector/profile-help.e2e.spec.ts`: replay and Help coverage.
- `frontend/tests/e2e/journeys/inspector/tutorial-mobile-scroll.e2e.spec.ts`: mobile scrolling and pinned phone navigation regression.

## Task execution contract

Each commit follows red-green-refactor: add or extend a test, run the smallest relevant test to observe the expected failure when behavior is new, implement the smallest change, rerun the test, then run the affected frontend lint/typecheck slice before committing. Do not combine unrelated cleanup with a task.

