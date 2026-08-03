function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

function isDocsOnlyPath(filePath) {
  return (
    filePath === "README.md" ||
    filePath.startsWith("docs/") ||
    filePath.startsWith("documentation/") ||
    filePath.endsWith(".md")
  );
}

function isFrontendPath(filePath) {
  return filePath.startsWith("frontend/") || filePath === "netlify.toml";
}

function isBackendPath(filePath) {
  return filePath.startsWith("backend/") || filePath === "render.yaml";
}

function isSharedPath(filePath) {
  return (
    filePath === "package.json" ||
    filePath === "package-lock.json" ||
    filePath === ".npmrc" ||
    filePath === "tsconfig.json" ||
    filePath.startsWith("scripts/") ||
    filePath.startsWith("tests/") ||
    filePath.startsWith(".github/workflows/")
  );
}

export function classifyChangedPaths(paths) {
  const normalizedPaths = paths.map(normalizePath).filter(Boolean);
  const result = {
    frontend: false,
    backend: false,
    shared: false,
    docsOnly: normalizedPaths.length > 0,
    workflow: false,
    anyRelevantChanges: false,
  };

  for (const filePath of normalizedPaths) {
    if (filePath.startsWith(".github/workflows/")) {
      result.workflow = true;
    }

    if (isFrontendPath(filePath)) {
      result.frontend = true;
      result.docsOnly = false;
      result.anyRelevantChanges = true;
      continue;
    }

    if (isBackendPath(filePath)) {
      result.backend = true;
      result.docsOnly = false;
      result.anyRelevantChanges = true;
      continue;
    }

    if (isSharedPath(filePath)) {
      result.frontend = true;
      result.backend = true;
      result.shared = true;
      result.docsOnly = false;
      result.anyRelevantChanges = true;
      continue;
    }

    if (!isDocsOnlyPath(filePath)) {
      result.frontend = true;
      result.backend = true;
      result.shared = true;
      result.docsOnly = false;
      result.anyRelevantChanges = true;
    }
  }

  return result;
}

if (process.argv[1]?.endsWith("ci-paths.mjs")) {
  const result = classifyChangedPaths(process.argv.slice(2));
  for (const [key, value] of Object.entries(result)) {
    console.log(`${key}=${value}`);
  }
}
