function toSurface({ relevant, shouldTrigger, providerManaged }) {
  return {
    relevant,
    shouldTrigger,
    providerManaged,
  };
}

function buildSurfaceSummary(name, surface, hookName, hookLabel, siteUrl, mode) {
  if (!surface.relevant) {
    return `- ${name} preview is not relevant for this ${mode} run.`;
  }

  if (surface.shouldTrigger) {
    const locationLine = siteUrl ? ` Expected URL: ${siteUrl}` : "";
    return `- ${name} preview is relevant. GitHub Actions will trigger the ${hookLabel} build hook.${locationLine}`;
  }

  if (surface.providerManaged) {
    return `- ${name} preview remains provider-managed because ${hookName} is not configured.`;
  }

  return `- ${name} preview is relevant, but no hook trigger will run.`;
}

export function buildPreviewPlan({
  frontendChanged,
  backendChanged,
  docsOnly,
  netlifyHookConfigured,
  renderHookConfigured,
  netlifySiteUrl,
  renderServiceUrl,
  mode = "pull request",
  refreshFrontend = false,
  refreshBackend = false,
}) {
  const manualMode = mode === "manual";

  const frontendRelevant = manualMode ? refreshFrontend : frontendChanged && !docsOnly;
  const backendRelevant = manualMode ? refreshBackend : backendChanged && !docsOnly;

  const frontendShouldTrigger = frontendRelevant && netlifyHookConfigured;
  const backendShouldTrigger = backendRelevant && renderHookConfigured;

  const result = {
    surfaces: {
      frontend: toSurface({
        relevant: frontendRelevant,
        shouldTrigger: frontendShouldTrigger,
        providerManaged: frontendRelevant && !netlifyHookConfigured,
      }),
      backend: toSurface({
        relevant: backendRelevant,
        shouldTrigger: backendShouldTrigger,
        providerManaged: backendRelevant && !renderHookConfigured,
      }),
    },
    summary: "",
  };

  const heading = docsOnly && !manualMode
    ? "Docs-only changes detected. Preview orchestration is skipped."
    : manualMode
      ? "Manual preview refresh requested."
      : "Preview evaluation for this pull request:";

  result.summary = [
    heading,
    buildSurfaceSummary(
      "Frontend",
      result.surfaces.frontend,
      "NETLIFY_BUILD_HOOK_URL",
      "Netlify",
      netlifySiteUrl,
      mode,
    ),
    buildSurfaceSummary(
      "Backend",
      result.surfaces.backend,
      "RENDER_DEPLOY_HOOK_URL",
      "Render",
      renderServiceUrl,
      mode,
    ),
  ].join("\n");

  return result;
}
