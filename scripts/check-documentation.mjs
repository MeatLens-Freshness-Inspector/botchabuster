import fs from "node:fs";
import path from "node:path";

const REQUIRED_DOCUMENTS = [
  "README.md",
  "ARCHITECTURE.md",
  "API_REFERENCE.md",
  "SECURITY.md",
  "GETTING_STARTED.md",
  "DEPLOYMENT.md",
  "PROJECT_OVERVIEW.md",
];

function listMarkdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(filePath);
    return entry.name.endsWith(".md") ? [filePath] : [];
  });
}

function isExternalTarget(target) {
  return /^(?:https?:\/\/|mailto:|#)/i.test(target);
}

export function checkDocumentation(repositoryRoot) {
  const documentationRoot = path.join(repositoryRoot, "documentation");
  const errors = [];

  if (!fs.existsSync(documentationRoot)) {
    return ["documentation directory is missing"];
  }

  for (const relativePath of REQUIRED_DOCUMENTS) {
    if (!fs.existsSync(path.join(documentationRoot, relativePath))) {
      errors.push(`missing required guide: documentation/${relativePath}`);
    }
  }

  for (const filePath of listMarkdownFiles(documentationRoot)) {
    const source = fs.readFileSync(filePath, "utf8");
    for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].trim();
      if (isExternalTarget(target)) continue;

      const relativeTarget = target.split("#", 1)[0];
      if (!relativeTarget) continue;

      const resolvedTarget = path.resolve(path.dirname(filePath), relativeTarget);
      if (!fs.existsSync(resolvedTarget)) {
        errors.push(`${path.relative(repositoryRoot, filePath)} links to missing ${target}`);
      }
    }
  }

  for (const relativePath of [
    "documentation/backend_documentation.md",
    "documentation/frontend_documentation.md",
  ]) {
    if (fs.existsSync(path.join(repositoryRoot, relativePath))) {
      errors.push(`obsolete documentation path exists: ${relativePath}`);
    }
  }

  return errors;
}

if (process.argv[1]?.endsWith("check-documentation.mjs")) {
  const errors = checkDocumentation(process.cwd());
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("documentation validation passed");
  }
}
