# September 19 Primary Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the September 19 MobileNetV3Small ONNX model the default inspection model while preserving all current model assets and selections.

**Architecture:** Add immutable `model5` source/public assets, repoint the existing `primary` runtime profile to `model5`, and add the existing `model4` runtime as a selectable `sep18_model` alternative. Keep catalog version keys and the backend migration synchronized.

**Tech Stack:** TypeScript, React/Vite, ONNX Runtime Web, Node test runner, Supabase SQL migrations, npm scripts.

## Global Constraints

- Preserve all existing model files; never overwrite `model4`.
- Keep the new model's metadata label order: `fresh`, `not fresh`, `spoiled`.
- Keep segmented HSV/LAB ROI preprocessing for the new primary model.
- Follow repository CI gates: lint, typecheck, tests, build, and deployment preflight.
- Do not stage unrelated worktree changes.

### Task 1: Add asset and catalog regression coverage

**Files:**
- Create: `model5/meatlens_best_fulldata_final_cnn_only_mobilenetv3small_metadata.json`
- Create: `model5/meatlens_best_fulldata_final_cnn_only_mobilenetv3small.onnx`
- Test: `frontend/tests/unit/features/offline-analysis/model-catalog.unit.test.ts`
- Test: `frontend/tests/unit/features/offline-analysis/analysis-runtime.unit.test.ts`

**Interfaces:**
- Produces the stable `sep19_model` and `sep18_model` variant names and the catalog version keys used by runtime, developer selection, and backend registration.

- [ ] Step 1: Copy the two source artifacts from `Downloads/september 19 model` into `model5` without changing bytes.
- [ ] Step 2: Update catalog tests first to expect `primary`, `sep18_model`, `seed123_model2`, `default`, `resnet50`, and `ensemble`; expect primary date `2026-09-19`, version key `mobilenet-primary-final-2026-09-19`, and the prior model key `mobilenet-sep18-model4-2026-09-18`.
- [ ] Step 3: Run `npm run test:unit -w frontend -- frontend/tests/unit/features/offline-analysis/model-catalog.unit.test.ts frontend/tests/unit/features/offline-analysis/analysis-runtime.unit.test.ts` and confirm the new expectations fail because the catalog/runtime do not yet define the variants.

### Task 2: Wire runtime and asset synchronization

**Files:**
- Modify: `frontend/src/features/offline-analysis/lib/model-catalog.ts`
- Modify: `frontend/src/features/offline-analysis/lib/mobilenet-runtime.ts`
- Modify: `scripts/sync-onnx-model.mjs`
- Modify: `scripts/check-netlify-preflight.mjs`

**Interfaces:**
- `MobileNetModelVariant` gains `sep18_model`.
- `MODEL_ASSET_PROFILES.primary` loads `/model/model5/meatlens_best_fulldata_final_cnn_only_mobilenetv3small.onnx` and its metadata.
- `MODEL_ASSET_PROFILES.sep18_model` retains the current `/model/model4/...` paths and segmented preprocessing contract.

- [ ] Step 1: Add `sep18_model` to `MOBILE_NET_MODEL_VARIANTS` and update catalog entries: primary added Sep 19 with expected accuracy `0.9481481481481482`; sep18 added Sep 18 with expected accuracy `0.907725321888412`.
- [ ] Step 2: Add the `sep18_model` profile and change only the primary profile's candidate paths to the new `model5` asset and metadata.
- [ ] Step 3: Add a `model5Files` sync block that copies both new assets to `frontend/public/model/model5`, leaving the existing `model4Files` block unchanged.
- [ ] Step 4: Add both new model5 paths and metadata paths to Netlify preflight checks while retaining every existing candidate.
- [ ] Step 5: Run the targeted catalog/runtime tests and confirm they pass.

### Task 3: Register the deployment version and verify the integrated build

**Files:**
- Create: `backend/supabase/migrations/20260919100000_register_september_19_deployment_model_version.sql`
- Modify: `frontend/tests/unit/features/inspection-workspace/inspection-model-selection.unit.test.ts`
- Modify: `frontend/tests/unit/features/offline-sync/offline-sync-manager.unit.test.ts`

**Interfaces:**
- Backend `model_versions` receives idempotent rows for `mobilenet-primary-final-2026-09-19` and `mobilenet-sep18-model4-2026-09-18`.
- Existing regular/locked-user selection remains `primary`; unlocked developers may select `sep18_model`.

- [ ] Step 1: Add the two migration rows with exact matching catalog keys and active dates.
- [ ] Step 2: Extend selection tests with `sep18_model` and run the targeted frontend unit tests.
- [ ] Step 3: Run `npm run sync:model` and verify new public assets exist while `frontend/public/model/model4` remains unchanged.
- [ ] Step 4: Run `npm run lint`, `npm run typecheck`, `npm run test:unit -w frontend`, `npm run test:architecture -w frontend`, `npm run build`, and the repository's relevant backend/contract checks.
- [ ] Step 5: Review `git diff --stat` and `git status --short`, stage only this feature's files, commit with `feat: make September 19 model primary`, and push the commit to `origin master` to trigger deployment.
