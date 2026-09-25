# Inspect-Tab Inspection Result Disputes

## Goal

Allow a meat inspector to dispute an incorrect inspection result immediately from the Inspect tab after the inspection has been saved.

## Scope

- Reuse the existing inspector dispute API and mutation.
- Preserve the existing History dispute workflow.
- Display the dispute action in the post-analysis Inspect-tab flow.
- Leave offline-queued scans undisputable until synchronization creates a server-side inspection ID.

## Design

The inspection workspace will retain the server-generated inspection ID returned by the existing create-inspection mutation. The Inspect tab will pass that ID and the completed analysis classification into a small dispute UI rendered with the existing post-save actions.

The dispute UI will:

1. Render only after an online save has returned an inspection ID.
2. Offer an explicit “Dispute result” action.
3. Open an inline form with an expected classification selector and a required reason.
4. Default the expected classification to the displayed result, matching the existing History workflow while allowing the inspector to select the result they believe is correct.
5. Enforce the existing 10–2,000 character reason bounds in the UI and rely on the backend for authoritative validation.
6. Disable duplicate submission while the mutation is pending.
7. Replace the form with a pending-review confirmation after a successful submission.
8. Surface the existing mutation error through the app’s toast behavior without clearing the form.

Offline-queued scans will not render the action because they do not yet have a server inspection ID. The existing queue/synchronization behavior remains unchanged.

## Data flow

```text
analysis result
    -> existing save mutation
    -> saved inspection ID in workspace state
    -> Inspect-tab dispute action
    -> existing POST /inspections/:id/disputes endpoint
    -> pending-review confirmation
```

No new backend route, database migration, or API contract is required.

## Testing

- Add a component test proving the Inspect-tab dispute action is absent before save and present after a saved inspection ID is supplied.
- Add a component test proving the form submits the selected classification and reason through the existing mutation seam and shows pending-review feedback.
- Run the focused frontend tests first, then the repository CI-equivalent local checks, including lint, typecheck, build, and the full test command.
- Create the ignored `backend/uploads` runtime directory in the fresh worktree when needed by the existing transport-upload test; do not commit generated upload files.
