import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dialogFiles = [
  {
    path: "../../../src/entities/inspection/ui/inspection-list-item.tsx",
    descriptionCount: 1,
  },
  {
    path: "../../../src/widgets/inspection-history/ui/inspection-detail-sheet.tsx",
    descriptionCount: 2,
  },
  {
    path: "../../../src/widgets/admin-dashboard/ui/admin-dashboard-dialogs.tsx",
    descriptionCount: 1,
  },
  {
    path: "../../../src/shared/ui/command.tsx",
    descriptionCount: 1,
  },
];

for (const dialogFile of dialogFiles) {
  test(`${dialogFile.path} describes every dialog content`, () => {
    const source = readFileSync(new URL(dialogFile.path, import.meta.url), "utf8");
    const descriptions = source.match(/<DialogDescription(?:\s|>)/g) ?? [];

    assert.equal(descriptions.length, dialogFile.descriptionCount);
  });
}

test("Workbox leaves developer dataset export downloads out of the API cache route", () => {
  const source = readFileSync(new URL("../../../vite.config.ts", import.meta.url), "utf8");

  assert.match(source, /!url\.pathname\.includes\("\/developer-dashboard\/datasets\/export\/"\)/);
});
