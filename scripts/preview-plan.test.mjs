import assert from "node:assert/strict";
import { test } from "node:test";

import { buildPreviewPlan } from "./preview-plan.mjs";

test("buildPreviewPlan reports provider-managed previews when hooks are not configured", () => {
  const result = buildPreviewPlan({
    frontendChanged: true,
    backendChanged: true,
    docsOnly: false,
    netlifyHookConfigured: false,
    renderHookConfigured: false,
  });

  assert.deepEqual(result.surfaces, {
    frontend: {
      relevant: true,
      shouldTrigger: false,
      providerManaged: true,
    },
    backend: {
      relevant: true,
      shouldTrigger: false,
      providerManaged: true,
    },
  });

  assert.match(
    result.summary,
    /frontend preview remains provider-managed because NETLIFY_BUILD_HOOK_URL is not configured/i,
  );
  assert.match(
    result.summary,
    /backend preview remains provider-managed because RENDER_DEPLOY_HOOK_URL is not configured/i,
  );
});

test("buildPreviewPlan triggers configured hooks for relevant preview surfaces", () => {
  const result = buildPreviewPlan({
    frontendChanged: true,
    backendChanged: false,
    docsOnly: false,
    netlifyHookConfigured: true,
    renderHookConfigured: true,
    netlifySiteUrl: "https://preview.example.netlify.app",
  });

  assert.deepEqual(result.surfaces, {
    frontend: {
      relevant: true,
      shouldTrigger: true,
      providerManaged: false,
    },
    backend: {
      relevant: false,
      shouldTrigger: false,
      providerManaged: false,
    },
  });

  assert.match(result.summary, /Frontend preview is relevant/);
  assert.match(result.summary, /GitHub Actions will trigger the Netlify build hook/);
  assert.match(result.summary, /https:\/\/preview\.example\.netlify\.app/);
});

test("buildPreviewPlan short-circuits docs-only changes", () => {
  const result = buildPreviewPlan({
    frontendChanged: false,
    backendChanged: false,
    docsOnly: true,
    netlifyHookConfigured: true,
    renderHookConfigured: true,
  });

  assert.equal(result.surfaces.frontend.relevant, false);
  assert.equal(result.surfaces.backend.relevant, false);
  assert.match(result.summary, /docs-only changes detected/i);
});

test("buildPreviewPlan supports manual refresh requests", () => {
  const result = buildPreviewPlan({
    frontendChanged: false,
    backendChanged: false,
    docsOnly: false,
    netlifyHookConfigured: true,
    renderHookConfigured: false,
    mode: "manual",
    refreshFrontend: true,
    refreshBackend: true,
  });

  assert.equal(result.surfaces.frontend.shouldTrigger, true);
  assert.equal(result.surfaces.backend.shouldTrigger, false);
  assert.match(result.summary, /manual preview refresh/i);
  assert.match(
    result.summary,
    /backend preview remains provider-managed because RENDER_DEPLOY_HOOK_URL is not configured/i,
  );
});
