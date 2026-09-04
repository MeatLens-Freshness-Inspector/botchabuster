# Landing Page Font Alignment Design

## Goal

Align the public landing page with the application-wide typography tokens while preserving its existing green-and-white visual design, layout, spacing, and content.

## Typography mapping

- Landing-page body copy, links, buttons, and labels use `var(--font-body)`, which resolves to Inter.
- Landing-page headings use `var(--font-display)`, which resolves to JetBrains Mono.
- The existing landing-page Helvetica fallback and broad heading inheritance override are removed so the page follows the same body/heading split as the rest of the system.

## Scope and verification

Only `frontend/src/pages/public/landing-page.css` and its visual-system unit test change for the implementation. The test will assert the two system font tokens are present and that the old Helvetica override is gone. Targeted unit tests, type checking, linting, and a production build will verify the change without altering unrelated worktree files.
