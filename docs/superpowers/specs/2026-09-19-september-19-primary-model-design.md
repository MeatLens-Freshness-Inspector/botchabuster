# September 19 Primary Model Design

## Goal

Make the ONNX model and metadata from `Downloads/september 19 model` the default inspection model without deleting or overwriting any existing model asset.

## Context

The frontend already has a `primary` MobileNetV3 selection. Its current runtime profile points at `frontend/public/model/model4`, while the repository also retains legacy MobileNetV3, seed123, ResNet50, and ensemble options. The new artifact is a MobileNetV3Small CNN-only model with 224x224 RGB input, three labels (`fresh`, `not fresh`, `spoiled`), and segmented HSV/LAB ROI preprocessing.

## Design

- Add the September 19 ONNX and metadata files under a new immutable `model5` asset directory and mirror them to `frontend/public/model/model5` through the existing sync script.
- Point the existing `primary` runtime profile at `model5`; keep its segmented-center-ROI preprocessing contract and use the imported metadata for the label order and input contract.
- Add the prior `model4` asset as an explicit `sep18_model` MobileNetV3 variant so it remains available to developers and is loaded by the existing model warmup path.
- Update the model catalog and deployment-version migration with stable September 19 and September 18 version keys. The September 19 version remains the primary entry; the prior model gets a distinct legacy entry.
- Extend preflight and tests to verify both the new primary assets and the preserved previous model assets are present, catalogued, and selectable.

## Data flow

1. `scripts/sync-onnx-model.mjs` copies source model assets into the frontend public model directories.
2. `mobilenet-runtime.ts` loads the `primary` profile first when normal inspection starts, fetches its metadata, applies segmented ROI preprocessing, and runs ONNX inference.
3. `analysis-runtime.ts` keeps the primary selection as the default for regular and locked users. Unlocked developers can select the preserved September 18 model, other existing models, or ensemble mode.
4. The resulting model version key is attached to analysis payloads and matches the seeded backend `model_versions` row.

## Error handling

Existing candidate-path fallback, metadata fallback, retry timing, and ONNX inference error handling remain unchanged. Missing September 19 assets fail the preflight/build gate; runtime fallback metadata is retained only for resilience, not as a substitute for checked-in metadata.

## Verification

- Unit tests prove the catalog order, primary date/version, preserved September 18 selection, and default runtime behavior.
- Asset/preflight checks prove both model files and both metadata files exist.
- Run targeted frontend unit tests, lint, typecheck, build, and the relevant CI test commands before pushing.

## Non-goals

- Do not delete, rename, overwrite, or retrain any existing model.
- Do not change the ONNX runtime library or dependency versions.
- Do not change model labels, class ordering, or preprocessing semantics supplied by the new metadata.
