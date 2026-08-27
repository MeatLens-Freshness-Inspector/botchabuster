# Required Inspection Images in PDF Exports

## Goal

Image-based PDF evidence exports must include the stored inspection image whenever an inspection has an image URL. They must not silently replace a failed image load with an “Inspection image unavailable” placeholder.

## Design

- Keep the existing image-first evidence layout and the intentional `No image captured` state for records that have no image URL.
- Make the default report inspection-image loader required: a non-empty image URL must resolve to a readable data URL.
- Preserve loader failures through the concurrency queue instead of resolving them to `null`.
- Include the requested URL and HTTP status, when available, in the thrown error so the export handler and browser console expose the actual storage or network problem.
- Make the PDF section builder throw when a record has an image URL but the image loader returns no asset. The export stops rather than producing a misleading partial evidence card.
- Keep dependency-injected test loaders supported, including loaders that return `null` for an explicit failure test.

## Compliance evidence

The right-hand column of admin pork evidence cards will show the regulatory compliance status and a reason derived from the three checks used by the backend: storage correctness, light-color correctness, and area cleanliness.

## Testing

- Add a failing test proving a required image-load failure rejects PDF document construction.
- Add a failing test proving the image-loader queue propagates rejected image loads.
- Add tests for compliance reasons: all checks pass, failed checks are listed, and pre-feature records explain that compliance was not available.
- Run the focused report suite, frontend typecheck, lint, and production build.
