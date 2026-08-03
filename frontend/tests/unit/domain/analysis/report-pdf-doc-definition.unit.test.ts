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

const sampleDtiInspectorModel: ReportDocumentModel = {
  organization: "dti",
  templateKey: "dti",
  kind: "inspector_daily",
  title: "Inspector Daily Report",
  subtitle: "Inspection Day: 2026-08-01",
  generatedAt: "Aug 2, 2026 4:00 PM",
  sections: [
    {
      id: "meat-summary",
      title: "Meat Inspection Summary",
      metrics: [
        { label: "Total Inspections", value: "1" },
        { label: "Average Confidence", value: "88%" },
      ],
    },
    {
      id: "meat-detail",
      title: "Daily Inspection Evidence",
      inspectionEvidence: [
        {
          id: "inspection-1",
          imageUrl: "https://example.com/unsegmented-pork.jpg",
          capturedAt: "2026-08-01 08:05:30",
          meatType: "pork",
          classification: "warning",
          confidenceLabel: "88%",
          location: "East Market",
        },
      ],
      evidenceLayout: "photo-first",
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

function collectNodeImages(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];

  const images: string[] = [];

  if ("image" in value && typeof value.image === "string") {
    images.push(value.image);
  }

  for (const nestedValue of Object.values(value)) {
    if (Array.isArray(nestedValue)) {
      for (const item of nestedValue) {
        images.push(...collectNodeImages(item));
      }
      continue;
    }

    images.push(...collectNodeImages(nestedValue));
  }

  return images;
}

function collectNodeTexts(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];

  const texts: string[] = [];

  if ("text" in value && typeof value.text === "string") {
    texts.push(value.text);
  }

  for (const nestedValue of Object.values(value)) {
    if (Array.isArray(nestedValue)) {
      for (const item of nestedValue) {
        texts.push(...collectNodeTexts(item));
      }
      continue;
    }

    texts.push(...collectNodeTexts(nestedValue));
  }

  return texts;
}

function findSectionBlock(content: unknown, sectionTitle: string) {
  assert.ok(Array.isArray(content));

  return content.find((entry) => {
    if (!entry || typeof entry !== "object" || !("stack" in entry)) return false;
    if (!Array.isArray(entry.stack) || entry.stack.length === 0) return false;

    const [firstNode] = entry.stack;

    return (
      !!firstNode &&
      typeof firstNode === "object" &&
      "text" in firstNode &&
      firstNode.text === sectionTitle
    );
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

test("buildReportDocDefinition renders unsegmented inspector evidence photos for dti exports", async () => {
  const requestedImages: string[] = [];
  const docDefinition = await buildReportDocDefinition(sampleDtiInspectorModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
    loadInspectionImageAsset: async (path) => {
      requestedImages.push(path);
      return `data:image/png;base64,${path}`;
    },
  });

  assert.deepEqual(requestedImages, [
    "https://example.com/unsegmented-pork.jpg",
  ]);

  const detailSection = findSectionBlock(
    docDefinition.content,
    "Market Field Inspection Evidence",
  );

  assert.ok(detailSection);
  assert.deepEqual(collectNodeImages(detailSection), [
    "data:image/png;base64,https://example.com/unsegmented-pork.jpg",
  ]);

  const sectionTexts = collectNodeTexts(detailSection);
  assert.ok(sectionTexts.includes("2026-08-01 08:05:30"));
  assert.ok(sectionTexts.includes("warning"));
  assert.ok(sectionTexts.includes("East Market"));
});

test("buildReportDocDefinition renders unsegmented inspector evidence photos for city vet exports", async () => {
  const requestedImages: string[] = [];
  const cityVetModel: ReportDocumentModel = {
    ...sampleDtiInspectorModel,
    organization: "city_veterinary_office_olongapo",
    templateKey: "city_vet",
  };

  const docDefinition = await buildReportDocDefinition(cityVetModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
    loadInspectionImageAsset: async (path) => {
      requestedImages.push(path);
      return `data:image/png;base64,${path}`;
    },
  });

  assert.deepEqual(requestedImages, [
    "https://example.com/unsegmented-pork.jpg",
  ]);

  const detailSection = findSectionBlock(
    docDefinition.content,
    "Veterinary Inspection Evidence",
  );

  assert.ok(detailSection);
  assert.deepEqual(collectNodeImages(detailSection), [
    "data:image/png;base64,https://example.com/unsegmented-pork.jpg",
  ]);
});

test("buildReportDocDefinition keeps gcccs inspector exports technical-first without loading evidence photos", async () => {
  const requestedImages: string[] = [];
  const gcccsInspectorModel: ReportDocumentModel = {
    ...sampleDtiInspectorModel,
    organization: "gordon_college_ccs",
    templateKey: "gcccs",
  };

  const docDefinition = await buildReportDocDefinition(gcccsInspectorModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
    loadInspectionImageAsset: async (path) => {
      requestedImages.push(path);
      return `data:image/png;base64,${path}`;
    },
  });

  assert.deepEqual(requestedImages, []);

  const detailSection = findSectionBlock(
    docDefinition.content,
    "Technical Inspection Evidence Log",
  );

  assert.ok(detailSection);
  assert.deepEqual(collectNodeImages(detailSection), []);
  assert.match(JSON.stringify(detailSection), /Technical Inspection Evidence Log/);
  assert.match(JSON.stringify(detailSection), /2026-08-01 08:05:30/);
});
