# Primary MobileNetV3 Model Selection Design

## Goal

Make the existing model3 MobileNetV3Small ONNX asset the application’s primary analysis model while preserving developer access to the other bundled models. Keep user-facing model names neutral and expose each model’s project-added date in the developer selector.

## Scope

This change is limited to frontend offline-analysis model selection, developer model controls, model metadata/catalog presentation, and tests. It does not change ONNX preprocessing, class labels, persistence schemas, or model binaries. The frontend analysis-source union is extended additively with `resnet50` so standalone ResNet50 results are labeled accurately; existing source values remain valid.

## Model catalog

Create one explicit catalog for the developer-selectable model choices. Each catalog entry contains:

- stable internal variant identifier;
- user-facing label;
- model and metadata candidate paths;
- model family/capability needed by the runtime;
- project-added date (`addedOn`), sourced from repository history;
- whether the option is the normal primary model.

The catalog entries are:

| Option | User-facing label | Added on | Runtime behavior |
| --- | --- | --- | --- |
| `primary` | Primary MobileNetV3 | 2026-08-13 | Existing model3 MobileNetV3Small ONNX asset |
| `seed123_model2` | Seed123 MobileNetV3 | 2026-05-19 | Existing model2 MobileNetV3Small ONNX asset |
| `default` | Legacy MobileNetV3 | 2026-05-05 | Existing seed42 MobileNetV3Small ONNX asset |
| `resnet50` | ResNet50 | 2026-05-01 | Existing ResNet50 ONNX asset |
| `ensemble` | Ensemble | composite | Primary MobileNetV3 plus ResNet50 |

The existing model3 filenames and any compatibility identifiers remain internal implementation details. The branded dataset/provider name is not shown in the application UI.

## Selection behavior

- `primary` is the default active MobileNetV3 variant in the runtime session.
- Regular users use `primary` for online and offline inspection analysis.
- The developer panel replaces overlapping model booleans with one explicit model selector and a single persisted selection.
- Developers can select any catalog model, including standalone ResNet50 and Ensemble.
- Ensemble uses the primary MobileNetV3 model as its MobileNet component and ResNet50 as its second component.
- Existing developer-option data is read compatibly. The previous default combination is normalized to `primary`; explicit legacy or seed123 choices remain selectable.
- Offline sync resolves the same selected model as the active inspection workspace so queued scans do not silently use a different model.

## Runtime changes

Extend analysis mode/model selection so standalone ResNet50 is supported in addition to MobileNetV3 and Ensemble. Model loading and readiness must correspond to the selected option:

- MobileNetV3 choices load and classify with the MobileNet runtime.
- ResNet50 loads and classifies with the ResNet runtime.
- Ensemble loads both runtimes and fuses their outputs using the existing ensemble implementation.

The existing model-load failure behavior remains intact. A failed selected model does not silently switch the normal single-model path to another model. Readiness and existing error messaging continue to communicate that analysis is unavailable until the selected runtime is ready.

## Developer UI

The developer panel presents the catalog as a mutually exclusive selector. Each model option shows its neutral label and added date, for example `Primary MobileNetV3 · Added Aug 13, 2026`. Ensemble is labeled as a composite option rather than a model binary. No user-facing copy references the provider/dataset name or internal model3 naming.

## Verification

Add or update tests to verify:

1. The runtime session defaults to `primary`.
2. Normal workspace and offline-sync resolution return `primary` by default.
3. Explicit developer selections resolve to seed123, legacy MobileNetV3, ResNet50, or Ensemble.
4. Ensemble selects the primary MobileNetV3 component.
5. Standalone ResNet50 loading/classification follows the selected analysis mode.
6. Legacy persisted developer settings migrate without losing intentional selections.
7. Catalog labels and added dates are present and neutral.
8. Standalone ResNet50 results expose `analysis_source: "resnet50"` and render the correct source label.
9. Existing offline-analysis, offline-sync, developer UI, and frontend build/type checks pass.

## Acceptance criteria

- A normal inspection uses the model3 MobileNetV3Small ONNX asset by default.
- A developer can choose any bundled model or Ensemble from one control.
- The selected option and its project-added date are visible in developer tools.
- Queued/offline analysis honors the same selection.
- Existing analysis output contracts and preprocessing behavior remain unchanged.
- No branded provider name appears in user-facing application text.
