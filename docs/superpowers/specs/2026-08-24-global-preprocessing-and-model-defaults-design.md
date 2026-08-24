# Global Preprocessing and Model Defaults

## Goal

Use the newest available analysis model and disable ROI segmentation for every normal inspection by default. Developer options remain diagnostic controls for unlocked developer accounts only.

## Current context

The analysis catalog identifies `Primary MobileNetV3` as the newest model, added on August 13, 2026. The application already defaults its runtime to the `primary` selection, but model-selection gates currently use the broader administrator role. ROI segmentation is controlled by a developer flag whose default is currently enabled.

## Requirements

- Regular users always use the newest `primary` analysis model.
- Anonymous, locked, and non-developer administrator sessions also use `primary`.
- An unlocked developer account may select another catalog model for comparison.
- Existing persisted developer model selections remain unchanged and become active only after developer unlock.
- ROI segmentation is disabled for regular users and all non-developer sessions.
- An unlocked developer account may explicitly enable segmentation through the existing developer option.
- Existing persisted developer segmentation preferences remain unchanged.
- No model assets, segmentation algorithm, backend schema, or public inspector control changes are included.

## Design

### Model selection

Keep `PRIMARY_ANALYSIS_MODEL` as the single application default and use it whenever the current session is not an unlocked developer session. Update inspection workspace and offline-sync selection helpers to receive the explicit developer-role state rather than inferring access from `isAdmin`. Only the conjunction of `isDeveloper` and a valid developer-options session may return the persisted model selection.

### Segmentation selection

Introduce one shared application default representing disabled ROI segmentation. Low-level capture and analysis APIs use that disabled default when callers omit the option. The inspection workspace resolves the effective value as follows:

1. Non-developer, anonymous, locked, and non-developer administrator sessions receive segmentation disabled.
2. An unlocked developer session receives the persisted developer flag.
3. The developer flag remains named `disableRoiSegmentation`, so `true` continues to mean that segmentation is disabled.

The resolved value is passed to both capture-preview preparation and active analysis. Offline queue sync uses the same primary model selection and does not read developer flags for non-developer sessions.

### Persistence and compatibility

No migration is needed. Explicit persisted booleans and model selections continue to normalize as before. Missing fields receive the new defaults. Existing developer values are honored once the account is recognized as a developer and the developer session is unlocked.

## Testing

Add or update tests to prove:

- omitted preprocessing options disable segmentation;
- the newest primary model is selected for non-developers and locked sessions;
- unlocked developers can select a persisted alternative model;
- non-developers cannot activate persisted developer model selections during offline sync;
- segmentation remains disabled for non-developers even when stored developer flags exist;
- unlocked developers can explicitly enable segmentation;
- the developer defaults and UI continue to expose the existing diagnostic controls.

Run the affected frontend unit tests first, followed by frontend typecheck, lint, build, and the full regression suite.

## Scope boundary

This change only adjusts default and role-gated selection behavior. It does not remove the developer controls, alter model files, retrain models, change segmentation mathematics, or modify persisted data formats.
