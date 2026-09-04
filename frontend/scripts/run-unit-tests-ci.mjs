import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const shardArgument = process.argv.find((argument) => argument.startsWith("--shard="));
const shardValue = shardArgument?.slice("--shard=".length) ?? "";
const shardParts = shardValue.split("/").map(Number);
const shard = shardParts[0];
const totalShards = shardParts[1];

if (!Number.isInteger(shard) || !Number.isInteger(totalShards) || shard < 1 || shard > totalShards) {
  console.error("Usage: npm run test:unit:ci -w frontend -- --shard=1/4");
  process.exit(1);
}

async function collectTestFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectTestFiles(entryPath)));
      continue;
    }

    if (/\.test\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

const unitTestRoot = path.resolve("tests/unit");
const testFiles = (await collectTestFiles(unitTestRoot)).sort();

const historicalCostOverrides = new Map([
  ["tests/unit/hooks/admin-dashboard-summary.unit.test.tsx", 50],
  ["tests/unit/hooks/admin-inspections-pagination.unit.test.tsx", 50],
]);

const weightedFiles = await Promise.all(
  testFiles.map(async (filePath) => {
    const source = await readFile(filePath, "utf8");
    const relativePath = path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");
    const testCount = Math.max(1, (source.match(/\b(?:test|it)\s*\(/g) ?? []).length);
    const componentWeight = filePath.endsWith(".tsx") ? 2 : 1;
    const estimatedCost =
      historicalCostOverrides.get(relativePath) ?? testCount * 2 + componentWeight + source.length / 4000;

    return { filePath, estimatedCost, relativePath };
  }),
);

const buckets = Array.from({ length: totalShards }, (_, index) => ({
  files: [],
  index,
  estimatedCost: 0,
}));

for (const file of weightedFiles.sort(
  (left, right) => right.estimatedCost - left.estimatedCost || left.relativePath.localeCompare(right.relativePath),
)) {
  const bucket = buckets.reduce((lightest, candidate) =>
    candidate.estimatedCost < lightest.estimatedCost ? candidate : lightest,
  );

  bucket.files.push(file.filePath);
  bucket.estimatedCost += file.estimatedCost;
}

const shardFiles = buckets[shard - 1].files;

if (shardFiles.length === 0) {
  console.error(`No unit test files assigned to shard ${shard}/${totalShards}.`);
  process.exit(1);
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const tsxCli = path.resolve(scriptDirectory, "../../node_modules/tsx/dist/cli.mjs");
const child = spawn(process.execPath, [tsxCli, "--test", ...shardFiles], {
  cwd: process.cwd(),
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
