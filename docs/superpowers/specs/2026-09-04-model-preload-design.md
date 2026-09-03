# Model Runtime Eager Preloading

## Problem

Developer settings can change the active analysis model between several MobileNetV3 variants and ResNet50. The frontend currently stores only one active MobileNetV3 ONNX session. Selecting another variant clears the current session, so the inspection workspace returns to a global "Preparing MobileNetV3..." state until the newly selected model finishes loading. This makes models that were previously usable unavailable immediately after a settings change.

## Goal

All configured analysis models should be loaded and ready independently of which model is selected. Switching the active model must reuse an existing runtime session when one is already loaded and must not unload other model sessions.

## Design

### Per-model runtime cache

Change the MobileNet runtime ownership from one mutable session to a cache keyed by `MobileNetModelVariant` (`primary`, `seed123_model2`, and `default`). Each cache entry owns its ONNX session, loaded model path, load promise, retry timestamp, metadata promise, and load generation. The runtime also keeps the active variant as a pointer into that cache.

`setActiveMobileNetModelVariant` will update the active pointer without releasing the previous session. A load already in progress for a different variant continues and can populate that variant's cache entry. Inference captures the active variant and its session at the beginning of a classification so an active-selection change cannot mix a session, metadata, or preprocessing contract during one inference.

The existing MobileNet public API remains available. The current-model functions continue to operate on the active variant, while an internal or feature-level variant loader supports eager warmup.

### Eager warmup

Expand the existing `prewarmModel()` lifecycle entry point so it starts background loads for every MobileNet catalog variant and the independent ResNet50 runtime. The loads may run concurrently, but each model must deduplicate its own in-flight promise. `loadActiveAnalysisModel` remains available for the active model and for explicit analysis recovery; eager warmup is an additional lifecycle operation, not a change to the selected analysis mode.

App startup and online recovery continue to call the existing prewarm entry point, so model selection is not required before the preload begins. If a model is not available, its load fails independently and does not clear or invalidate successfully loaded sessions. Existing retry behavior is retained for failed active loads and online recovery.

### Readiness and settings behavior

`isAnalysisReady()` remains scoped to the active analysis selection: MobileNet selections require their cached variant, ResNet50 requires the ResNet session, and ensemble requires the primary MobileNet plus ResNet50. The inspection UI therefore remains honest about the model it is about to run, while a warmed model becomes ready immediately when selected.

No developer-settings storage or model-selection contract changes are required. Selecting a model still persists the same `AnalysisModelSelection`; only the runtime lifecycle behind that selection changes.

## Error handling and resource behavior

- A failed model load is isolated to that model's cache entry.
- A stale load result is discarded if the corresponding cache entry's generation changes.
- Switching models does not release cached sessions.
- Runtime release remains available for replacing or explicitly resetting a cache entry, but normal model selection does not invoke it.
- The app continues to use the existing online/offline readiness and retry paths.
- Background preload failures are logged without blocking app startup or preventing already-loaded models from being used.

## Tests

Add regression coverage for:

1. Retaining a loaded MobileNet session when switching to another variant and restoring it when switching back.
2. Tracking loaded state and model paths independently for each MobileNet variant.
3. Deduplicating concurrent loads for the same variant.
4. Eager warmup covering all catalog MobileNet variants and ResNet50.
5. Preserving active-model and ensemble readiness semantics.

Run the focused offline-analysis unit tests, then the frontend typecheck, lint, and relevant unit/component suites.

## Acceptance criteria

- After startup warmup completes, every available catalog model is ready without first being selected.
- Changing the developer-selected model does not make a previously loaded model enter a preparation state.
- Selecting a model that is still loading shows preparation only for that selected model.
- Ensemble mode can use its MobileNet and ResNet sessions without evicting any MobileNet variant.
- Existing analysis, settings persistence, offline sync, and model-version behavior remain unchanged.
