import assert from "node:assert/strict";
import test from "node:test";

import { buildReportDocDefinition } from "../../../../src/lib/reports/pdf/buildDocDefinition";
import type { ReportDocumentModel } from "../../../../src/lib/reports/types";

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

function readBackgroundRectangles(background: unknown) {
  assert.ok(Array.isArray(background));

  return background.flatMap((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      !("canvas" in entry) ||
      !Array.isArray(entry.canvas)
    ) {
      return [];
    }

    return entry.canvas;
  });
}

test("buildReportDocDefinition applies the organization page frame and section ordering", async () => {
  const docDefinition = await buildReportDocDefinition(sampleGcccsModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
  });

  assert.equal(docDefinition.pageSize, "LETTER");
  assert.deepEqual(docDefinition.pageMargins, [52, 120, 52, 92]);
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

  const footer =
    typeof docDefinition.footer === "function"
      ? docDefinition.footer(1, 2)
      : docDefinition.footer;

  assert.deepEqual(
    footer && typeof footer === "object" && "margin" in footer
      ? footer.margin
      : undefined,
    [0, 0, 52, 54],
  );

  const contentJson = JSON.stringify(docDefinition.content);
  assert.match(contentJson, /Technical and System Overview/);
  assert.match(contentJson, /Meat Inspection Summary/);
});

test("buildReportDocDefinition masks the city vet placeholder body text in the repeated frame", async () => {
  const cityVetModel: ReportDocumentModel = {
    ...sampleGcccsModel,
    organization: "city_veterinary_office_olongapo",
    templateKey: "city_vet",
  };

  const docDefinition = await buildReportDocDefinition(cityVetModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
  });

  const background =
    typeof docDefinition.background === "function"
      ? docDefinition.background(1, 1)
      : docDefinition.background;

  assert.ok(Array.isArray(background));
  assert.equal(
    background[0] && typeof background[0] === "object" && "image" in background[0]
      ? background[0].image
      : undefined,
    "mocked:/letterheads/rendered/city-vet-page.png",
  );
  assert.deepEqual(
    readBackgroundRectangles(background),
    [
      {
        type: "rect",
        x: 40,
        y: 108,
        w: 532,
        h: 64,
        color: "#FFFFFF",
      },
    ],
  );
});

test("buildReportDocDefinition masks the dti placeholder body text in the repeated frame", async () => {
  const dtiModel: ReportDocumentModel = {
    ...sampleGcccsModel,
    organization: "dti",
    templateKey: "dti",
  };

  const docDefinition = await buildReportDocDefinition(dtiModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
  });

  const background =
    typeof docDefinition.background === "function"
      ? docDefinition.background(1, 1)
      : docDefinition.background;

  assert.ok(Array.isArray(background));
  assert.equal(
    background[0] && typeof background[0] === "object" && "image" in background[0]
      ? background[0].image
      : undefined,
    "mocked:/letterheads/rendered/dti-page.png",
  );
  assert.deepEqual(
    readBackgroundRectangles(background),
    [
      {
        type: "rect",
        x: 40,
        y: 108,
        w: 532,
        h: 64,
        color: "#FFFFFF",
      },
    ],
  );
});
