import assert from "node:assert/strict";
import test from "node:test";

import { buildReportDocDefinition } from "../../src/lib/reports/pdf/buildDocDefinition";
import type { ReportDocumentModel } from "../../src/lib/reports/types";

const sampleGcccsModel: ReportDocumentModel = {
  organization: "gordon_college_ccs",
  templateKey: "gcccs",
  kind: "admin_range",
  title: "Administrative Report",
  subtitle: "Range: 2026-08-01 to 2026-08-02",
  generatedAt: "Aug 2, 2026 4:00 PM",
  sections: [
    {
      id: "org-overview",
      title: "Organization Overview",
      metrics: [
        { label: "Total Inspections", value: "12" },
        { label: "Average Confidence", value: "92%" },
      ],
    },
    {
      id: "meat-summary",
      title: "Meat Inspection Summary",
      metrics: [
        { label: "Total Inspections", value: "12" },
        { label: "Average Confidence", value: "92%" },
      ],
    },
    {
      id: "meat-detail",
      title: "Meat Inspection Detail",
      tables: [
        {
          title: "Inspection Detail",
          columns: ["Created", "Inspector", "Location", "Meat"],
          rows: [["2026-08-02 08:00", "A. Reyes", "East Tapinac", "Pork"]],
        },
      ],
    },
  ],
};

test("buildReportDocDefinition applies the organization page frame and section ordering", async () => {
  const docDefinition = await buildReportDocDefinition(sampleGcccsModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
  });

  assert.equal(docDefinition.pageSize, "LETTER");
  assert.equal(typeof docDefinition.background, "function");
  assert.equal(typeof docDefinition.footer, "function");
  assert.ok(Array.isArray(docDefinition.content));

  const background =
    typeof docDefinition.background === "function"
      ? docDefinition.background(1, 1)
      : docDefinition.background;

  assert.equal(
    background && typeof background === "object" && "image" in background
      ? background.image
      : undefined,
    "mocked:/letterheads/rendered/gcccs-page.png",
  );

  const contentJson = JSON.stringify(docDefinition.content);
  assert.match(contentJson, /Technical and System Overview/);
  assert.match(contentJson, /Meat Inspection Summary/);
});
