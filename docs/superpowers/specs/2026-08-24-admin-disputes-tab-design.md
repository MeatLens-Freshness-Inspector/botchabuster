# Admin Disputes Tab Design

## Goal

Make inspection-result disputes a first-class Admin Dashboard area that is visible to both administrators and developers, while keeping developer-only tools under Developer Settings.

## Navigation

- Add `Disputes` to the shared administrator tab list.
- Keep `Developer Settings` as a developer-only top-level tab.
- Remove `Disputes` from the nested Developer Settings workspace tabs.
- Preserve the existing `/admin` route and backend authorization rules.

## UI and data flow

The top-level Disputes tab will render the existing dispute review cards through a dedicated review-queue hook. The hook will call the existing admin-authorized dispute endpoint, expose loading state, apply-to-developer-dataset for developers, and approve/reject actions for admins. It will not initialize the developer overview, dataset, or training-run requests, so a regular admin opening Disputes will not trigger developer-only API calls.

Developers will see both Disputes and Developer Settings. Admins will see Disputes without seeing Developer Settings. Existing pending-dispute behavior remains unchanged: approved or rejected items leave the pending queue.

## Testing

- Verify the shared tab list includes Disputes for regular admins.
- Verify developer users receive both Disputes and Developer Settings.
- Verify non-developers cannot select Developer Settings but can select Disputes.
- Run the focused frontend tests, frontend typecheck, and the full frontend test suite.

## Scope

No database schema, migration, backend route, or authorization changes are required.
