# Revision Checklist Remediation Design

## Context

The repository-wide audit found that most checklist items are implemented, but several behaviors are either misleading or not verifiable in the production build. The current validated inspection workflow is pork-only. DTI has explicitly allowed non-pork values for future purposes, so non-pork support must remain available for historical records, filters, datasets, exports, and future model work.

The technical adviser has also approved the current location approach: the inspector manually selects the official market label, while the device records independent GPS coordinates when available. This design will not infer the nearest market or add geofencing.

The user confirmed that the City Vet completed the expert consultation relevant to checklist item #8. No unsupported personal or credential details will be invented in the codebase.

## Goals

1. Make the production build pass.
2. Preserve DTI-compatible non-pork data paths while clearly labeling non-pork demonstrations and displayed records as future/unvalidated scope.
3. Make the camera request prefer continuous autofocus without breaking devices that do not expose that capability.
4. Use the system's actual freshness vocabulary consistently.
5. Preserve the approved hybrid market/GPS workflow.
6. Add regression tests for each changed behavior.

## Non-goals

- Do not reject, delete, migrate away, or hide non-pork records.
- Do not constrain backend `meat_type` to `pork`.
- Do not add nearest-market selection, geofencing, or market-coordinate administration.
- Do not implement neural-network training in the browser.
- Do not rewrite the existing user manual, privacy policy, terms, or other product documentation to change their status or claims. The user explicitly excluded documentation clarification from this remediation.
- Do not fabricate a City Vet name, date, signature, credential, or consultation record.

## Chosen approach

### 1. Production build repair

Update `frontend/vite.config.ts` to resolve the source alias through `import.meta.url` and `fileURLToPath`, which is valid in the project's ESM configuration. Keep the existing Vite/PWA behavior unchanged.

### 2. Scope metadata and labeling

Add a shared meat-type scope helper that identifies pork as the currently validated production category and all other enum values as future/unvalidated categories. Use it at user-visible boundaries where meat type is shown:

- public landing ticker and simulator samples;
- inspection list/history cards and detail views where the meat type is displayed;
- report rows or report detail labels where a non-pork record could otherwise look like a validated result.

The label must be informational, not a validation gate. Existing meat-type enums, backend acceptance, offline queues, datasets, filters, and exports remain unchanged.

### 3. Camera autofocus preference

Add `focusMode: { ideal: "continuous" }` to the preferred camera constraints. It must remain an ideal constraint, so browsers/devices without continuous autofocus can still open the camera. Existing capability inspection, manual focus controls, and post-capture resolution/sharpness rejection remain authoritative.

Add a unit test asserting that the preferred request contains the autofocus preference and that fallback behavior remains available.

### 4. Terminology consistency

Replace runtime/legal-facing use of `Suspect` with the existing classification vocabulary (`Warning` or `Not Fresh`, depending on the intended meaning). Do not introduce `OK Fresh`; the canonical positive label remains `Fresh`.

### 5. Checklist evidence treatment

Treat the City Vet consultation as the evidence for the expert-consultation requirement. Treat model training as an integrated curation/export/import workflow whose execution remains local, without claiming in-app neural-network training. Treat GPS as complete under the adviser-approved hybrid design.

## Verification

Run the focused unit tests for public landing, inspection display, camera capture, offline analysis, and reports; run typecheck and lint; run the full unit/architecture/contract suites; and run the production build. Re-run the repository audit after the changes and confirm that no non-pork acceptance paths were removed.

## Acceptance criteria

- `npm.cmd run build` passes.
- Non-pork values are still accepted by domain types, backend payload validation, datasets, and exports.
- Non-pork user-visible examples/records carry a future/unvalidated scope indicator.
- Camera startup requests continuous focus as an optional preference and still falls back safely.
- No user-facing `OK Fresh` or `Suspect` label remains in the audited runtime/legal surfaces.
- No nearest-market or geofencing logic is introduced.
- Tests and static checks pass, with any pre-existing non-blocking warnings reported separately.
