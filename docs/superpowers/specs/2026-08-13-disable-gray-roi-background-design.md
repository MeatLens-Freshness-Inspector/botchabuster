# Disable Gray ROI Background Developer Option

## Status

Approved design; implementation pending.

## Context

The developer settings already support per-user flags stored in browser local storage. For the segmented-center-ROI model variants, the capture preview currently replaces pixels outside the selected foreground region with RGB 127 gray. This makes the preview useful for diagnosing preprocessing, but it is not always desirable when comparing model behavior against the original image.

The new developer option must change runtime behavior, not only the settings UI. When enabled, it must disable ROI segmentation and use the ordinary center-cropped 224x224 image for both the model-input preview and analysis.

## Goals

- Add a persisted developer flag named `disableRoiSegmentation`.
- Preserve the current segmented behavior by default.
- Make the flag affect both preview generation and model analysis.
- Apply the new mode immediately to an existing capture preview when the setting changes.
- Keep the setting scoped to the signed-in developer account and compatible with existing local-storage payloads.
- Add regression tests that prove the setting reaches the preprocessing and inference decisions.

## Non-goals

- Changing the segmentation algorithm or its gray value.
- Changing preprocessing for legacy model variants when the new flag is off.
- Adding a backend/database setting; developer flags remain browser-local like the existing options.
- Changing the public inspector experience or exposing the toggle to non-developers.

## Proposed behavior

The Developer Toggles panel adds:

- Label: `Disable gray ROI background`
- Description: `Uses the original center-cropped 224x224 image instead of segmented ROI preprocessing.`
- Default: off
- Availability: only when developer options are unlocked

When off, segmented-center-ROI variants continue to generate a center crop, apply ROI segmentation, and display the gray-background preview as they do today.

When on, segmented-center-ROI variants generate the center crop without applying segmentation. The analysis path also receives a null guide box for those variants, ensuring camera captures use the same center-crop geometry rather than a camera overlay guide crop. Legacy model variants do not use the gray ROI preprocessing and retain their existing behavior in either state.

## Architecture and data flow

1. `DeveloperOptionsFlags` and its defaults gain `disableRoiSegmentation: boolean`. Existing stored flag objects are merged with the default object, so older accounts receive `false` without migration.
2. `DeveloperOptionsPanel` registers the flag in the existing `FLAG_DEFINITIONS` list. Its existing `updateFlag` handler persists the complete flag object and updates local React state.
3. `useInspectionWorkspace` reads the flag with the other developer flags and exposes it through the inspection page view model.
4. `InspectCaptureSection` and `CameraCapture` pass the setting into `useCameraCapture`.
5. `useCameraCapture` uses the setting when preparing the model-input preview:
   - segmented mode: current segmented-center-ROI behavior;
   - disabled mode: forced center crop with `applySegmentation: false`.
   The preview preparation callback must depend on the setting, and an effect should regenerate the preview when an uploaded/captured source already exists and the setting changes.
6. `useInspectionWorkspace.handleAnalyze` passes the setting to `analyzeOffline`. The analysis option is forwarded through `runActiveAnalysis` to the active model classifier. When the flag is enabled for a segmented-center-ROI variant, the MobileNet classifier receives no guide box, producing a center crop. Legacy variants continue to use their existing guide-box behavior.

The setting is a preprocessing choice only. It does not switch models, reload model weights, alter result interpretation, or change saved inspection fields.

## Testing

Add or update tests for these behaviors:

- Developer-option storage returns `false` by default and preserves a stored `true` value through a write/read round trip.
- Model-input preparation does not invoke the segmenter when `applySegmentation` is false, and the disabled mode is wired to that option.
- Camera preview mode selection uses center crop and no segmentation when the flag is enabled, and retains segmented-center-ROI behavior when disabled.
- Analysis option propagation causes segmented-center-ROI variants to receive a null guide box in disabled mode and the capture guide box in normal mode; legacy variants remain unchanged.
- Existing developer UI/public API tests continue to pass.

## Acceptance criteria

- A developer can unlock settings, enable `Disable gray ROI background`, capture or upload an image, and see a normal center-cropped preview without the gray mask.
- Toggling the option while a source image is already present refreshes the preview without requiring a page reload or a new capture.
- Running analysis with the option enabled uses the center crop; the setting is not preview-only.
- Reloading the page preserves the setting for that developer account.
- Turning the option off restores the current segmented preview and guided analysis behavior.
- Non-developer and locked users cannot activate the option through the UI.

## Risks and mitigations

- The model2/model3 assets may have been trained on segmented inputs. The option is intentionally developer-only and off by default; its description makes the comparison mode explicit.
- Preview and inference could drift if only one path is updated. Tests must assert both paths, and the same flag should be passed through both call chains.
- Changing the flag during an asynchronous preview generation could display stale output. Existing request-id cancellation logic should remain in place, and the regenerated request must use the latest flag value.
