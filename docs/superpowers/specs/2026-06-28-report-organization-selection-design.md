# Report Organization Selection Design

## Summary

Add a report organization selection for users so generated reports can render organization-specific branding in their header. New users will choose their organization during signup. Existing users will remain unchanged in storage, and their reports will temporarily fall back to Gordon College CCS until an admin manually assigns their organization from the admin dashboard.

## Goals

- Let new users choose one of three report organizations during signup.
- Store the chosen organization on the user profile.
- Let admins manually assign or update the organization for any user from the existing user management flow.
- Use the stored organization only for generated report headers.
- Preserve current behavior for already registered users without forcing a backfill.

## Non-Goals

- Changing authentication, authorization, or onboarding behavior.
- Adding a general-purpose role or permission system for these organizations.
- Exposing this setting on the regular user profile page.
- Changing inspection analytics, filtering, or data export contents beyond report branding.

## Supported Organizations

The system will support exactly three organization values:

- `dti`
- `city_veterinary_office_olongapo`
- `gordon_college_ccs`

These are internal stored values. UI labels and report headers will use:

- `DTI`
- `City Veterinary Office of Olongapo`
- `Gordon College CCS`

## Existing System Context

The current system already has:

- A custom signup page in the frontend.
- A backend `/auth/sign-up` API that wraps Supabase auth signup.
- Profile creation in `AuthService.ensureProfileExists`, which currently persists `full_name` and `inspector_code`.
- Admin user create and edit flows in the admin dashboard backed by `ProfileClient`, `ProfileController`, and `ProfileService`.
- Client-side report generation for the History page via `buildDetailedHistoryReportHtml`.

The new organization setting fits best in `profiles`, because signup, admin management, and report generation can all read and write the same field.

## Data Model

### Profile Field

Add a nullable `report_organization` column to `public.profiles`.

Requirements:

- Type: text
- Nullable: yes
- Constraint: value must be `dti`, `city_veterinary_office_olongapo`, or `gordon_college_ccs` when present

### Why Nullable

The field stays nullable so existing user rows are not modified during migration. This prevents unintended changes for already registered users while still allowing reports to render through fallback logic.

## Source of Truth

`profiles.report_organization` is the single source of truth for report branding.

Auth metadata may optionally include the same value at signup for profile bootstrap convenience, but all report rendering and admin edits must read and write the profile column.

## Frontend Design

### Signup

Extend the signup form with a required selector labeled for organization selection. The available choices are:

- DTI
- City Veterinary Office of Olongapo
- Gordon College CCS

Behavior:

- The field is required for new signups.
- Validation should block submission if no organization is selected.
- The selected value should travel through the existing signup flow without changing any unrelated signup behavior.

### Admin Dashboard

Extend the existing admin user create and edit form with the same organization selector.

Behavior:

- Admins can set the value when creating a user.
- Admins can update the value when editing any user.
- The field should use the same allowed values and labels as signup.
- Existing users with no assigned organization should remain editable and assignable through this form.

### Regular User Profile

Do not add this setting to the standard user profile page in this change. The current requirement is limited to signup and admin-managed assignments.

## Backend Design

### Signup API

Extend the signup request contract to accept `reportOrganization`.

Validation:

- Required for signup.
- Must match one of the three supported internal values.
- Invalid values return `400`.

### Profile Creation

When `AuthService.ensureProfileExists` creates a missing profile row for a newly created user, it must also persist the validated report organization.

This applies to:

- Normal signup-driven profile creation
- Any fallback profile creation path that uses signup metadata for a newly created user

### Admin User Management

Extend admin create and update service methods to accept and persist `report_organization`.

Validation:

- Accept null or one supported value where appropriate for admin updates.
- Reject unsupported values with a `400`-class failure at the controller boundary.

### Profile Read APIs

Expose `report_organization` in profile payloads so:

- Auth context can cache it with the rest of the profile
- Admin dashboard can display and edit it
- History page report generation can use it from the current signed-in profile

## Report Generation Behavior

### History Detailed Report

The detailed History export remains client-side HTML-to-print generation.

Before rendering the report header:

1. Read `profile.report_organization` from the authenticated user profile in frontend state.
2. If the value is one of the supported organizations, use it.
3. If the value is missing, null, or otherwise invalid, fall back to `gordon_college_ccs`.

### Header Branding Rules

The current hardcoded header should be replaced with an organization-resolved header. The report header should render one of:

- `DTI`
- `City Veterinary Office of Olongapo`
- `Gordon College CCS`

The rest of the report body remains functionally unchanged unless minor copy adjustments are needed to make the header coherent.

## Legacy User Behavior

Existing users are intentionally not backfilled in the migration.

Behavior for legacy users:

- Their stored profile remains unchanged after deployment.
- Report export still succeeds.
- Report header defaults to `Gordon College CCS`.
- Admin can later assign the correct organization in the dashboard, after which future reports use the assigned header.

## Validation and Error Handling

### Frontend

- Signup must prevent submission when organization is missing.
- Admin create and edit forms must prevent invalid empty states where a selected option is required by that form's rules.

### Backend

- Signup rejects missing or invalid `reportOrganization`.
- Admin create and update endpoints reject unsupported values.
- Profile persistence errors continue to surface through the existing error handling patterns.

### Report Fallback

If the profile contains no organization or an unexpected value reaches the report builder, the export should not fail. It should fall back to `Gordon College CCS`.

## Testing Strategy

### Frontend Tests

- Update signup coverage to assert the selected organization is submitted in the signup payload.
- Add report export coverage asserting that the report header uses the signed-in user's organization.
- Add fallback coverage asserting that a missing organization renders `Gordon College CCS`.
- Add admin dashboard coverage for creating or editing a user with an organization assignment.

### Backend Tests

- Add or extend service/controller tests for signup validation of `reportOrganization`.
- Add or extend profile/admin tests for persisting `report_organization`.

### Migration Safety

- Verify that profiles without the new column populated still load normally through existing profile APIs once the migration is applied.

## Files Expected To Change

Likely areas of change:

- Supabase migration for `profiles.report_organization`
- Frontend signup form, hook, and validation path
- Auth context signup call chain
- Frontend auth API client
- Backend auth controller and auth service
- Profile client, controller, and service types
- Admin dashboard user management form
- History report builder and related history hook/types
- Frontend test fixtures and Playwright coverage

## Rollout Notes

- No backfill is required for initial release.
- No route changes are required.
- No permission changes are required.
- Admin assignment becomes the post-release mechanism for correcting legacy users from the default fallback header.
