# Admin User Role Management Design

## Goal

Allow developers to change a managed user’s role from the admin Users screen using the existing `user`, `admin`, and `developer` roles. Every successful role change must be recorded in the existing encrypted admin audit-log system. No new role values or role tables are introduced.

## Scope and role model

- The existing `user_roles` table and `app_role` enum remain the source of truth.
- The role selector exposes only `user`, `admin`, and `developer`.
- `moderator` remains a supported existing role but is not offered by this control and is preserved if it is present on a target user.
- A role change replaces all existing managed-role rows (`user`, `admin`, and `developer`) for the target with the selected role. This prevents a target from retaining an old privileged role while preserving unrelated roles.
- Only developers may mutate roles. Ordinary profile editing remains available to admins through the current admin user-edit flow.

## Backend architecture and data flow

Add a dedicated role-change operation instead of extending the ordinary profile update payload:

`PUT /api/profiles/admin/users/:id/role`

Request body:

```json
{
  "role": "admin",
  "password": "developer-personal-password"
}
```

The route will require an authenticated developer. The controller/use-case boundary will validate the target ID, role, and password input, then verify the supplied password against the authenticated developer’s email using the existing password-authentication gateway. The password is used only for verification and is never written to logs, database rows, or response payloads.

The role service will read the target’s current managed role, remove the target’s existing managed-role rows, and insert the selected existing role. The user list response will include the current role needed to render the role badge and selector. The service returns the previous and new role to the controller for audit data.

Role changes are performed separately from profile-field updates. A profile update therefore cannot implicitly change authorization, and an ordinary admin update request cannot smuggle a role field into the existing endpoint.

## Audit logging

After a successful role mutation, write one existing encrypted audit-log event:

- `event_type`: `admin.user.role_change`
- `event_time`: server-generated ISO timestamp
- `actor`: authenticated developer ID and primary role
- `source`: request IP and user agent
- `data.user_id`: target user ID
- `data.previous_role`: previous managed role, or `null` if none existed
- `data.new_role`: selected role

The developer password is never included in the payload. Audit-write failures follow the existing admin mutation behavior: the request returns an error rather than reporting a successful audited change. The operation must not log the password or expose it in error messages.

## Frontend behavior

- The admin user list displays each user’s current role.
- Developers see a role selector with exactly `user`, `admin`, and `developer`.
- The developer-password field is required when the selected role differs from the current role.
- Profile-only edits do not require password confirmation.
- Non-developer admins can edit ordinary profile details but do not receive role mutation controls.
- The UI sends role changes to the dedicated endpoint and updates the local user row only after success.
- Failed or rejected password verification leaves the role unchanged and displays the backend error.

## Error handling and security

- Reject unauthenticated requests with the existing authentication response.
- Reject authenticated non-developers with `403 Forbidden`.
- Reject missing or malformed role/password input with `400 Bad Request`.
- Reject an incorrect developer password without changing roles or writing a successful role-change event.
- Validate role values server-side; client-side selector restrictions are not relied upon.
- Keep existing CSRF/session protections on the mutating endpoint.
- Avoid returning sensitive authentication details in errors.

## Testing strategy

Backend tests will cover:

1. A developer with a correct password can change a target’s managed role.
2. The role mutation removes old managed roles, preserves unrelated roles, and assigns the selected role.
3. A non-developer is rejected before mutation.
4. An incorrect password is rejected before mutation.
5. Invalid role values are rejected.
6. A successful change writes `admin.user.role_change` with previous/new roles and no password.

Frontend tests will cover:

1. The role selector exposes only the three requested roles.
2. Password confirmation is required only when the role changes.
3. Non-developers do not receive role mutation controls.
4. A successful role change updates the edited user row.
5. A failed role change leaves the row unchanged and surfaces an error.

The affected backend unit/integration tests, frontend unit/component tests, lint, typecheck, and build will be run locally according to the repository CI workflow. Existing tests and unrelated worktree changes will be preserved.
