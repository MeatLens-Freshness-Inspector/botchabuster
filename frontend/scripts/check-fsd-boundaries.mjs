import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const layerOrder = new Map([
  ["shared", 0],
  ["entities", 1],
  ["features", 2],
  ["widgets", 3],
  ["pages", 4],
  ["app", 5],
]);

const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const legacyRootDirectories = new Set([
  "components",
  "contexts",
  "hooks",
  "integrations",
  "lib",
  "types",
]);
const importPattern =
  /\b(?:import\s+(?:[^"']+?\s+from\s+)?|export\s+[^"']+\s+from\s+|import\s*\()\s*["']([^"']+)["']/g;

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(entryPath)));
      continue;
    }

    if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

function normalizeImportPath(importerPath, importPath, rootDir) {
  if (importPath.startsWith("@/")) {
    return importPath.slice(2);
  }

  if (importPath.startsWith(".")) {
    const resolvedPath = path.resolve(path.dirname(importerPath), importPath);
    return path.relative(rootDir, resolvedPath).split(path.sep).join("/");
  }

  return null;
}

function getLayerPath(relativePath) {
  const segments = relativePath.split("/");
  const layer = segments[0];

  if (!layerOrder.has(layer)) {
    return null;
  }

  return {
    layer,
    rank: layerOrder.get(layer),
    slice: segments[1] ?? null,
    depth: segments.length,
  };
}

function getLegacyRootOwner(relativePath) {
  const owner = relativePath.split("/")[0];
  return legacyRootDirectories.has(owner) ? owner : null;
}

export async function findLegacyRootImportOwners(rootDir) {
  const sourceFiles = await collectSourceFiles(rootDir);
  const owners = [];

  for (const sourceFile of sourceFiles) {
    const sourceRelativePath = path
      .relative(rootDir, sourceFile)
      .split(path.sep)
      .join("/");
    const source = await readFile(sourceFile, "utf8");
    const importPaths = [...source.matchAll(importPattern)].map((match) => match[1]);

    for (const importPath of importPaths) {
      const normalizedPath = normalizeImportPath(sourceFile, importPath, rootDir);
      const owner = normalizedPath ? getLegacyRootOwner(normalizedPath) : null;

      if (!owner) {
        continue;
      }

      owners.push({
        file: sourceRelativePath,
        importPath,
        owner,
      });
    }
  }

  return owners.sort((left, right) =>
    (left.file + ":" + left.importPath).localeCompare(right.file + ":" + right.importPath),
  );
}

export async function findViolations(rootDir) {
  const sourceFiles = await collectSourceFiles(rootDir);
  const violations = [];

  for (const sourceFile of sourceFiles) {
    const sourceRelativePath = path
      .relative(rootDir, sourceFile)
      .split(path.sep)
      .join("/");
    const sourceLayer = getLayerPath(sourceRelativePath);

    if (!sourceLayer) {
      continue;
    }

    const source = await readFile(sourceFile, "utf8");
    const importPaths = [...source.matchAll(importPattern)].map((match) => match[1]);

    for (const importPath of importPaths) {
      const normalizedPath = normalizeImportPath(sourceFile, importPath, rootDir);
      const importedLayer = normalizedPath ? getLayerPath(normalizedPath) : null;

      if (!importedLayer) {
        continue;
      }

      if (sourceLayer.rank < importedLayer.rank) {
        violations.push({
          file: sourceRelativePath,
          importPath,
          rule: "upward-layer-import",
        });
        continue;
      }

      const crossesSliceInternals =
        sourceLayer.rank === importedLayer.rank &&
        sourceLayer.slice &&
        importedLayer.slice &&
        sourceLayer.slice !== importedLayer.slice &&
        importedLayer.depth > 2;

      if (crossesSliceInternals) {
        violations.push({
          file: sourceRelativePath,
          importPath,
          rule: "cross-slice-deep-import",
        });
      }
    }
  }

  return violations.sort((left, right) =>
    (left.file + ":" + left.importPath).localeCompare(right.file + ":" + right.importPath)
  );
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
  const violations = await findViolations(rootDir);
  const legacyRootImportOwners = await findLegacyRootImportOwners(rootDir);
  const report = { violations, legacyRootImportOwners };

  console.log(JSON.stringify(report, null, 2));

  if (process.argv.includes("--enforce") && (violations.length > 0 || legacyRootImportOwners.length > 0)) {
    process.exitCode = 1;
  }
}
