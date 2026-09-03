# Model Runtime Eager Preloading Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

Goal: Keep every configured analysis model loaded and immediately reusable when developer settings change the active model.

Architecture: Replace the single mutable MobileNetV3 session with a cache containing one runtime entry per MobileNet variant. Keep the active variant as a pointer into that cache, and make the existing prewarmModel lifecycle call load every MobileNet variant plus ResNet50 independently. Keep active-model readiness and model-selection persistence unchanged.

Tech Stack: React 18, TypeScript, Vite, ONNX Runtime Web, Node test runner through tsx, and Playwright.

## Global Constraints

- All configured analysis models should be loaded and ready independently of which model is selected.
- Switching the active model must reuse an existing runtime session when one is already loaded and must not unload other model sessions.
- isAnalysisReady() remains scoped to the active analysis selection.
- No developer-settings storage or model-selection contract changes are required.
- Background preload failures must not block app startup or prevent already-loaded models from being used.
- Do not modify unrelated existing working-tree changes.
- Follow red-green-refactor: each behavior change starts with a failing test and is verified before moving on.

---

## File Map

- Modify frontend/src/features/offline-analysis/lib/model-catalog.ts: publish the canonical MobileNet variant list.
- Modify frontend/src/features/offline-analysis/lib/mobilenet-session.ts: own independent runtime entries while preserving active-entry accessors.
- Modify frontend/src/features/offline-analysis/lib/mobilenet-runtime.ts: load, read, and classify against a selected cached variant.
- Modify frontend/src/features/offline-analysis/lib/analysis-runtime.ts: expose a testable all-model warmup operation and use it from prewarmAnalysisModel().
- Modify frontend/tests/unit/features/offline-analysis/mobilenet-session.unit.test.ts: add the switch-away/switch-back regression.
- Add frontend/tests/unit/features/offline-analysis/analysis-prewarm.unit.test.ts: test full-catalog warmup and failure isolation.
- Modify frontend/tests/unit/features/offline-analysis/analysis-runtime.unit.test.ts only if an additional active/ensemble assertion is required.

## Task 1: Add the per-variant session contract

Files:
- Modify frontend/src/features/offline-analysis/lib/model-catalog.ts
- Modify frontend/src/features/offline-analysis/lib/mobilenet-session.ts
- Test frontend/tests/unit/features/offline-analysis/mobilenet-session.unit.test.ts

Interfaces:
- Produce MOBILE_NET_MODEL_VARIANTS: readonly MobileNetModelVariant[] with primary, seed123_model2, and default.
- Produce MobileNetRuntimeEntry with session, loadedModelPath, loadPromise, metadataPromise, nextRetryAt, and loadGeneration.
- Produce MobileNetSession.getRuntime(variant): MobileNetRuntimeEntry and resetVariant(variant): MobileNetOnnxSession | null.
- Keep MobileNetSession.session, loadedModelPath, loadGeneration, and switchVariant() as active-entry accessors.

- [ ] Step 1: Replace the old invalidation test with this failing retention test.

~~~ts
test("preserves each loaded MobileNet runtime when switching variants", () => {
  const session = new MobileNetSession();
  const primarySession = {} as NonNullable<typeof session.session>;
  const legacySession = {} as NonNullable<typeof session.session>;

  session.session = primarySession;
  session.loadedModelPath = "/model/primary.onnx";

  session.switchVariant("default");
  assert.equal(session.session, null);

  session.session = legacySession;
  session.loadedModelPath = "/model/legacy.onnx";

  session.switchVariant("primary");
  assert.equal(session.session, primarySession);
  assert.equal(session.loadedModelPath, "/model/primary.onnx");

  session.switchVariant("default");
  assert.equal(session.session, legacySession);
  assert.equal(session.loadedModelPath, "/model/legacy.onnx");
});
~~~

- [ ] Step 2: Run the focused test and confirm it fails for the old invalidation behavior.

Run:
~~~powershell
npm exec --workspace frontend -- tsx --test tests/unit/features/offline-analysis/mobilenet-session.unit.test.ts
~~~

Expected: the retention test fails because the current switchVariant() clears the session and path.

- [ ] Step 3: Add the canonical variant list.

Add this to model-catalog.ts:
~~~ts
export const MOBILE_NET_MODEL_VARIANTS: readonly MobileNetModelVariant[] = [
  "primary",
  "seed123_model2",
  "default",
] as const;
~~~

- [ ] Step 4: Replace the single mutable state in mobilenet-session.ts with a cache.

Use this shape:
~~~ts
export interface MobileNetRuntimeEntry {
  session: MobileNetOnnxSession | null;
  loadedModelPath: string | null;
  loadPromise: Promise<boolean> | null;
  metadataPromise: Promise<MeatLensModelMetadata> | null;
  nextRetryAt: number;
  loadGeneration: number;
}

getRuntime(variant = activeModelVariant): MobileNetRuntimeEntry
switchVariant(nextVariant): MobileNetOnnxSession | null
resetVariant(variant = activeModelVariant): MobileNetOnnxSession | null
~~~

Initialize one entry for each MOBILE_NET_MODEL_VARIANTS value. The active session, path, and generation properties should delegate to the active entry. switchVariant() must only change activeModelVariant and return the previous session; it must not clear state or increment a generation. resetVariant() increments only the requested entry generation, clears only that entry, and returns its previous session.

- [ ] Step 5: Run the focused test and confirm it passes.

~~~powershell
npm exec --workspace frontend -- tsx --test tests/unit/features/offline-analysis/mobilenet-session.unit.test.ts
~~~

Expected: all MobileNetSession tests pass, including the switch-away/switch-back regression.

- [ ] Step 6: Commit the cache contract.

~~~powershell
git add frontend/src/features/offline-analysis/lib/model-catalog.ts frontend/src/features/offline-analysis/lib/mobilenet-session.ts frontend/tests/unit/features/offline-analysis/mobilenet-session.unit.test.ts
git commit -m "fix: retain MobileNet sessions across model switches"
~~~

## Task 2: Make MobileNet loading and inference variant-aware

Files:
- Modify frontend/src/features/offline-analysis/lib/mobilenet-runtime.ts
- Test frontend/tests/unit/features/offline-analysis/mobilenet-session.unit.test.ts

Interfaces:
- Produce loadMobileNetV3ModelVariant(variant, options): Promise<boolean>.
- Keep loadMobileNetV3Model(options): Promise<boolean> as an active-variant wrapper.
- Keep isModelReady(), getLoadedModelPath(), setActiveMobileNetModelVariant(), and classifyWithMobileNetV3() compatible with existing callers.

- [ ] Step 1: Add this failing isolated-lifecycle test.

~~~ts
test("keeps load generations and retry state independent per variant", () => {
  const session = new MobileNetSession();
  const primary = session.getRuntime("primary");
  const legacy = session.getRuntime("default");

  primary.loadGeneration = 4;
  primary.nextRetryAt = 100;
  legacy.loadGeneration = 2;
  legacy.nextRetryAt = 200;

  session.resetVariant("primary");

  assert.equal(primary.loadGeneration, 5);
  assert.equal(primary.nextRetryAt, 0);
  assert.equal(legacy.loadGeneration, 2);
  assert.equal(legacy.nextRetryAt, 200);
});
~~~

- [ ] Step 2: Run the focused test and verify it fails until lifecycle state is per-entry.

~~~powershell
npm exec --workspace frontend -- tsx --test tests/unit/features/offline-analysis/mobilenet-session.unit.test.ts
~~~

Expected: the test fails because the current class has no per-variant runtime entries or resetVariant().

- [ ] Step 3: Move MobileNet load and metadata state into the requested cache entry.

In mobilenet-runtime.ts:
- Remove module-level loadPromise, metadataPromise, metadataPromiseVariant, and nextRetryAt.
- Make loadModelMetadata(variant, profile) store its promise in modelSession.getRuntime(variant).metadataPromise.
- Implement loadMobileNetV3ModelVariant(variant, options) using only that entry's session, loadPromise, nextRetryAt, and loadGeneration.
- Pass variant and the captured entry generation into tryLoadModelFromCandidates().
- Store a created session only when the captured generation still matches the same variant entry.
- Release a created session if its generation is stale.
- Clear only that entry's loadPromise in finally and update only that entry's retry timestamp when no session was stored.

The active wrapper must be:
~~~ts
export function loadMobileNetV3Model(options: LoadModelOptions = {}): Promise<boolean> {
  return loadMobileNetV3ModelVariant(modelSession.activeModelVariant, options);
}
~~~

Update setActiveMobileNetModelVariant() to change the active pointer and log the selection without resetting or releasing the previous entry. isModelReady() and getLoadedModelPath() must read the active entry.

- [ ] Step 4: Capture the active variant and session once at inference start.

The first lines of classifyWithMobileNetV3() should establish stable local references:
~~~ts
const activeVariant = modelSession.activeModelVariant;
const runtime = modelSession.getRuntime(activeVariant);
const activeSession = runtime.session;
if (!activeSession) return null;

const profile = getModelProfile(activeVariant);
const metadata = await loadModelMetadata(activeVariant, profile);
~~~

Use activeSession, runtime.loadedModelPath, profile, and the active variant's preprocessing contract for the rest of the classification. Do not read modelSession.session again after awaiting.

- [ ] Step 5: Run focused offline-analysis tests.

~~~powershell
npm exec --workspace frontend -- tsx --test tests/unit/features/offline-analysis/mobilenet-session.unit.test.ts tests/unit/features/offline-analysis/mobilenet-public-api.unit.test.ts tests/unit/features/offline-analysis/analysis-runtime.unit.test.ts
~~~

Expected: all focused tests pass with no unhandled promise or TypeScript errors.

- [ ] Step 6: Commit the variant-aware runtime.

~~~powershell
git add frontend/src/features/offline-analysis/lib/mobilenet-runtime.ts frontend/tests/unit/features/offline-analysis/mobilenet-session.unit.test.ts
git commit -m "fix: cache MobileNet runtime per variant"
~~~

## Task 3: Eagerly preload the complete analysis catalog

Files:
- Modify frontend/src/features/offline-analysis/lib/analysis-runtime.ts
- Add frontend/tests/unit/features/offline-analysis/analysis-prewarm.unit.test.ts

Interfaces:
- Produce loadAllAnalysisModels(options, loaders): Promise<PromiseSettledResult<boolean>[]>.
- Produce AnalysisWarmupLoaders with the production loader signatures.
- Change prewarmAnalysisModel() to start all MobileNet variant and ResNet50 loads.
- Keep loadActiveAnalysisModel() scoped to the active selection.

- [ ] Step 1: Add the failing warmup tests.

Create analysis-prewarm.unit.test.ts:
~~~ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  MOBILE_NET_MODEL_VARIANTS,
  type MobileNetModelVariant,
} from "../../../../src/features/offline-analysis/lib/model-catalog";
import { loadAllAnalysisModels } from "../../../../src/features/offline-analysis/lib/analysis-runtime";

test("eager warmup schedules every MobileNet variant and ResNet50", async () => {
  const mobileCalls: MobileNetModelVariant[] = [];
  let resNetCalls = 0;

  const results = await loadAllAnalysisModels({}, {
    loadMobileNetV3ModelVariant: async (variant) => {
      mobileCalls.push(variant);
      return true;
    },
    loadResNet50Model: async () => {
      resNetCalls += 1;
      return true;
    },
  });

  assert.deepEqual(mobileCalls, MOBILE_NET_MODEL_VARIANTS);
  assert.equal(resNetCalls, 1);
  assert.equal(results.length, MOBILE_NET_MODEL_VARIANTS.length + 1);
  assert.ok(results.every((result) => result.status === "fulfilled" && result.value === true));
});

test("one eager-load failure is isolated from the other model loads", async () => {
  const results = await loadAllAnalysisModels({}, {
    loadMobileNetV3ModelVariant: async (variant) => {
      if (variant === "default") throw new Error("legacy model unavailable");
      return true;
    },
    loadResNet50Model: async () => true,
  });

  assert.equal(results.length, MOBILE_NET_MODEL_VARIANTS.length + 1);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 3);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
});
~~~

- [ ] Step 2: Run the new tests and confirm the missing warmup API fails.

~~~powershell
npm exec --workspace frontend -- tsx --test tests/unit/features/offline-analysis/analysis-prewarm.unit.test.ts
~~~

Expected: the test fails because loadAllAnalysisModels() and the canonical variant list are not available before implementation.

- [ ] Step 3: Add the testable all-model loader.

In analysis-runtime.ts, define:
~~~ts
export interface AnalysisModelLoadOptions {
  forceRetry?: boolean;
}

export interface AnalysisWarmupLoaders {
  loadMobileNetV3ModelVariant: (
    variant: MobileNetModelVariant,
    options?: AnalysisModelLoadOptions,
  ) => Promise<boolean>;
  loadResNet50Model: (options?: AnalysisModelLoadOptions) => Promise<boolean>;
}

export function loadAllAnalysisModels(
  options: AnalysisModelLoadOptions = {},
  loaders = defaultWarmupLoaders,
): Promise<PromiseSettledResult<boolean>[]> {
  return Promise.allSettled([
    ...MOBILE_NET_MODEL_VARIANTS.map((variant) =>
      loaders.loadMobileNetV3ModelVariant(variant, options),
    ),
    loaders.loadResNet50Model(options),
  ]);
}
~~~

Set defaultWarmupLoaders to the real MobileNet variant loader and loadResNet50Model. Use loadAllAnalysisModels() in prewarmAnalysisModel() only when navigator.onLine is true. Keep loadActiveAnalysisModel() unchanged for analyzeOffline() and active-model recovery.

- [ ] Step 4: Run warmup and active-mode tests.

~~~powershell
npm exec --workspace frontend -- tsx --test tests/unit/features/offline-analysis/analysis-prewarm.unit.test.ts tests/unit/features/offline-analysis/analysis-runtime.unit.test.ts tests/unit/features/offline-analysis/mobilenet-session.unit.test.ts
~~~

Expected: all tests pass, including the isolated rejected-load assertion and existing mode-selection assertions.

- [ ] Step 5: Commit eager preloading.

~~~powershell
git add frontend/src/features/offline-analysis/lib/analysis-runtime.ts frontend/tests/unit/features/offline-analysis/analysis-prewarm.unit.test.ts
git commit -m "feat: eagerly warm all analysis models"
~~~

## Task 4: Verify frontend integration and readiness contracts

Files:
- Modify frontend/tests/unit/features/offline-analysis/public-api.unit.test.ts only if the final warmup API is published through the feature barrel.
- Modify frontend/tests/unit/features/offline-analysis/mobilenet-public-api.unit.test.ts only if the variant loader is published through the MobileNet facade.
- Modify frontend/tests/unit/features/offline-analysis/analysis-runtime.unit.test.ts for any active/ensemble readiness regression exposed by the implementation.

Interfaces:
- No developer-settings storage changes.
- No UI copy changes; the existing preparation label remains visible only while the selected model is not ready.
- App boot and offline-sync callers continue using prewarmModel() from the offline-analysis feature barrel.

- [ ] Step 1: Preserve active selection semantics with this contract assertion.

~~~ts
test("active selection remains independent from eager warmup coverage", () => {
  setActiveAnalysisModel("primary");
  assert.equal(getActiveAnalysisModel(), "primary");
  assert.equal(getActiveAnalysisMode(), "mobilenetv3");

  setActiveAnalysisModel("resnet50");
  assert.equal(getActiveAnalysisModel(), "resnet50");
  assert.equal(getActiveAnalysisMode(), "resnet50");

  setActiveAnalysisModel("ensemble");
  assert.equal(getActiveAnalysisModel(), "ensemble");
  assert.equal(getActiveAnalysisMode(), "ensemble");
});
~~~

This test verifies selection state without requiring model assets.

- [ ] Step 2: Run all offline-analysis unit tests.

~~~powershell
npm exec --workspace frontend -- tsx --test tests/unit/features/offline-analysis/**/*.test.ts
~~~

Expected: all offline-analysis tests pass with clean output.

- [ ] Step 3: Run frontend typecheck and lint.

~~~powershell
npm run typecheck -w frontend
npm run lint -w frontend
~~~

Expected: both commands exit with code 0 and report no new errors.

- [ ] Step 4: Run frontend unit, component, and integration suites.

~~~powershell
npm run test:unit -w frontend
npm run test:component -w frontend
npm run test:integration -w frontend
~~~

Expected: all three suites pass. Existing unrelated working-tree modifications remain untouched.

- [ ] Step 5: Build the frontend and inspect only the relevant diff.

~~~powershell
npm run build:frontend
git diff HEAD~3..HEAD -- frontend/src/features/offline-analysis/lib/model-catalog.ts frontend/src/features/offline-analysis/lib/mobilenet-session.ts frontend/src/features/offline-analysis/lib/mobilenet-runtime.ts frontend/src/features/offline-analysis/lib/analysis-runtime.ts
~~~

Expected: the production build succeeds and the diff contains only per-model caching and eager warmup changes.

- [ ] Step 6: Commit final test adjustments if required.

~~~powershell
git add frontend/tests/unit/features/offline-analysis
git commit -m "test: verify eager model readiness contracts"
~~~

Do not create an empty commit when no final test adjustment was needed.

## Final Acceptance Check

- [ ] A model loaded before a developer-settings switch remains cached and immediately reusable when selected again.
- [ ] Startup warmup requests all three MobileNet variants and ResNet50.
- [ ] One failed preload does not reject or invalidate other model loads.
- [ ] Active-model readiness remains accurate for MobileNet, ResNet50, and ensemble.
- [ ] Frontend typecheck, lint, unit, component, integration, and production build verification pass.

