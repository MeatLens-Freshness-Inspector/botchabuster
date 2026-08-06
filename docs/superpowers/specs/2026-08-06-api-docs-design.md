# API Docs Developer Settings Design

Date: 2026-08-06
Status: Approved for implementation

## Summary

Add an `API Docs` tab inside the existing developer workspace. The tab is a Swagger-style API explorer backed by a typed OpenAPI-like catalog and a Postman-style request executor.

The explorer documents every currently registered `/api` operation, grouped by backend route category. Developers can select an operation, fill path/query/header/body fields, send it with the current application session, inspect the response, copy a cURL equivalent, and replay recent requests.

## Goals

- Document all registered `/api` operations in the developer workspace.
- Categorize operations by backend route namespace.
- Preserve the existing admin dashboard shell and responsive desktop/mobile behavior.
- Execute requests against the configured API base URL using the current signed-in developer's auth context.
- Support JSON, URL-encoded, multipart form-data, and empty request bodies where the backend accepts them.
- Show request and response details useful for debugging API behavior.
- Keep request history local to the browser and never persist access or CSRF tokens.
- Add focused unit/component coverage before production implementation.
- Make at least 15 meaningful commits, with each commit representing a reviewable feature slice or verification/documentation milestone.

## Non-Goals

- Exposing arbitrary third-party URLs or turning the browser into an unrestricted proxy.
- Replacing the existing API clients used by product features.
- Generating a server-side OpenAPI document from Express at runtime.
- Persisting saved requests or response payloads in the database.
- Creating API keys, OAuth clients, or a separate developer authentication system.
- Hiding destructive or privileged endpoints from the catalog; their permission requirements must be visible instead.

## Categories

The catalog groups operations using these route categories:

- Authentication: `/api/auth`
- Analysis: `/api/analysis`
- Access Codes: `/api/access-codes`
- Inspections: `/api/inspections`
- Profiles: `/api/profiles`
- Statistics: `/api/stats`
- Uploads: `/api/upload`
- Chat: `/api/chat`
- Market Locations: `/api/market-locations`
- Audit Logs: `/api/audit-logs`
- Developer Options: `/api/developer-options`
- Developer Dashboard: `/api/developer-dashboard`
- User Chat: `/api/user-chat`

Every operation must have a stable id, HTTP method, relative path, human-readable summary, category, permission label, path parameters, query parameters, request body mode/schema when applicable, and expected response content type.

## User Experience

### Workspace placement

The existing internal developer workspace tabs become:

1. Overview
2. Developer Settings
3. API Docs
4. Datasets
5. Training

The API Docs tab is developer-only because its parent workspace is developer-only. It must not be fetched or rendered for regular administrators.

### Explorer layout

Desktop uses a three-zone layout inside the existing dashboard surface:

- Category rail: collapsible category groups with operation counts and method-colored operation rows.
- Request inspector: selected method/path, permission badge, editable parameters, headers, body editor, and Send action.
- Response/history area: status, elapsed time, response size, response body/headers tabs, cURL copy, and recent request history.

Mobile keeps the same information architecture but stacks the zones. Category and operation selection use compact controls, and request/response panels remain independently readable without horizontal page overflow.

### Request behavior

- The base URL is the configured `API_BASE_URL` and is displayed but not replaced with an arbitrary URL.
- The current app session is used automatically. Browser requests use credentialed cookies; native requests use the cached Bearer token behavior already used by `apiRequest`.
- Mutating requests use the existing CSRF token injection path.
- Path parameters are substituted after URL encoding.
- Query parameters are omitted when empty and encoded with `URLSearchParams`.
- JSON bodies are parsed before sending so malformed JSON is shown as a local validation error.
- Multipart forms provide text fields and a file picker for endpoints such as image upload and training-package import.
- Custom headers are supported, but auth and CSRF headers are controlled by the application transport and cannot be overwritten by the editor.
- DELETE requests require an explicit confirmation before sending.
- A request can be reset to its catalog defaults.

### Response behavior

- Show status code and status text with semantic color, elapsed milliseconds, and response size.
- Pretty-print valid JSON and provide a raw text view for non-JSON responses.
- Show response headers in a separate tab.
- Show readable API error messages using the existing error response conventions.
- Allow copying the response body and generated cURL command.
- Record the last 20 requests in local storage without auth or CSRF values. History entries contain operation id, resolved URL, method, sanitized headers, body, status, elapsed time, and timestamp.
- Replaying a history item restores the editor fields but does not automatically send the request.

## Visual Direction

Use the Industrial anchor within the existing admin dashboard shell. The API area uses JetBrains Mono for method/path, JSON, headers, and response metrics; flat border-led panels; restrained green, amber, and red status semantics; and tabular numerics. Existing dashboard typography, spacing, rounded containers, theme tokens, and responsive conventions remain the integration boundary.

The differentiator is a persistent request-to-response split: the selected operation remains visible beside its live response on desktop, making the surface read as an interactive API workbench rather than a static reference page.

All example values are explicit editable placeholders such as `{id}`, `"{}"`, or `Select a file`; no fabricated user records, telemetry, or successful response data are shown.

## Architecture

### Catalog

Create a focused catalog module under the developer dashboard components. It exports the operation definitions and category metadata. The catalog is the UI source of truth for documented paths and forms, and a test asserts that every backend route operation is represented exactly once.

The catalog should use discriminated body modes:

- `none`
- `json`
- `form-data`

JSON body definitions include a default editor string and content type. Form-data definitions identify text fields and optional file fields. Parameters are represented separately from body fields.

### Request domain utilities

Keep request construction and execution outside React components:

- `buildApiDocsRequest`: resolve path/query parameters, sanitize headers, and create the final `RequestInit`.
- `executeApiDocsRequest`: call `fetch` through `applyApiRequestInit`, parse response metadata/body, and normalize API errors.
- `formatApiDocsResponse`: produce display-safe JSON/raw text and byte size.
- `buildApiDocsCurl`: generate a copyable cURL command without exposing stored credentials.
- `apiDocsHistory`: validate, save, load, replay, and clear local history entries.

These utilities are independently testable and should not import React.

### React state

Create a `useApiDocs` hook responsible for selected operation, editor state, request execution state, response state, and history. The hook should initialize from the first catalog operation, synchronize operation changes with defaults, and keep execution state local to the tab.

### Components

Split UI responsibilities into focused components:

- `ApiDocsSection`: composition and responsive layout.
- `ApiDocsCategoryNav`: category and operation selection.
- `ApiDocsRequestPanel`: request metadata, parameters, headers, body, reset, and send.
- `ApiDocsResponsePanel`: response metrics, body/headers tabs, errors, copy actions.
- `ApiDocsHistoryPanel`: local request history, replay, clear.

The existing `DeveloperTabContent` only adds the new tab and passes no API-specific state through the broader admin hook.

## Testing

### Domain tests

- Catalog category and operation coverage.
- Path/query encoding and omission of empty values.
- JSON validation and body construction.
- Form-data construction without manually setting the multipart boundary.
- Protected header behavior and CSRF transport delegation.
- Response parsing for JSON, text, empty bodies, and API errors.
- cURL sanitization.
- History persistence excludes auth and CSRF headers and caps entries at 20.

### Component tests

- Categories render all operations grouped correctly.
- Selecting an operation loads its defaults.
- Sending a request shows loading then response metadata.
- Malformed JSON blocks execution with an inline error.
- DELETE confirmation is required.
- Replay restores fields without sending.
- API Docs is reachable from the developer workspace and does not alter existing tabs.

### Verification

Run focused frontend tests, frontend typecheck, frontend lint, frontend build, and the relevant existing dashboard/auth test suites. Before claiming completion, run the verification commands again from the final worktree state.

## Commit Plan

The implementation will use these reviewable commit boundaries, each non-empty:

1. Approved design specification.
2. Implementation plan and catalog test fixtures.
3. Catalog types and category definitions.
4. Complete endpoint catalog.
5. Request construction tests and implementation.
6. Response normalization tests and implementation.
7. cURL generation tests and implementation.
8. History persistence tests and implementation.
9. Hook state tests and implementation.
10. Category navigation component and tests.
11. Request editor component and tests.
12. Response viewer component and tests.
13. History panel and replay behavior.
14. Developer workspace integration and responsive layout.
15. Accessibility, copy actions, and destructive-request confirmation.
16. Documentation, lint/typecheck/build fixes, and final verification.

