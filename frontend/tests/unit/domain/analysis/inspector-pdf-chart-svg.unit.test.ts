import assert from "node:assert/strict";
import test from "node:test";

import { buildReportDocDefinition } from "../../../../src/lib/reports/pdf/buildDocDefinition";
import type { ReportDocumentModel } from "../../../../src/lib/reports/types";

// commit 07: dti inspector renders SVG graphs
// commit 08: city vet inspector renders SVG graphs
// commit 09: gcccs inspector renders SVG graphs
// commit 10: empty chart emits emptyState text, not SVG

// ---------- helpers (mirrors report-pdf-doc-definition.unit.test.ts) ----------

function collectNodeSvgs(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];

  const svgs: string[] = [];

  if ("svg" in value && typeof value.svg === "string") {
    svgs.push(value.svg);
  }

  for (const nestedValue of Object.values(value)) {
    if (Array.isArray(nestedValue)) {
      for (const item of nestedValue) {
        svgs.push(...collectNodeSvgs(item));
      }
      continue;
    }

    svgs.push(...collectNodeSvgs(nestedValue));
  }

  return svgs;
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

// ---------- shared fixtures ----------

const graphCharts = [
  {
    id: "classification-breakdown",
    title: "Classification Breakdown",
    kind: "bar" as const,
    emptyState: "No data for this day",
    points: [
      { label: "fresh", value: 2, color: "hsl(142, 71%, 45%)" },
      { label: "spoiled", value: 1, color: "hsl(0, 84%, 60%)" },
    ],
  },
  {
    id: "meat-type-breakdown",
    title: "Meat Type Breakdown",
    kind: "bar" as const,
    emptyState: "No data for this day",
    points: [
      { label: "pork", value: 2 },
      { label: "chicken", value: 1 },
    ],
  },
  {
    id: "confidence-by-hour",
    title: "Confidence by Hour",
    kind: "line" as const,
    emptyState: "No data for this day",
    points: [
      { label: "08:00", value: 80 },
      { label: "09:00", value: 95 },
    ],
  },
];

const inspectorEvidenceSections = [
  {
    id: "meat-summary",
    title: "Meat Inspection Summary",
    metrics: [
      { label: "Total Inspections", value: "3" },
      { label: "Average Confidence", value: "85%" },
    ],
  },
  {
    id: "report-graphs",
    title: "Report Graphs",
    charts: graphCharts,
  },
  {
    id: "meat-detail",
    title: "Daily Inspection Evidence",
    inspectionEvidence: [
      {
        id: "inspection-1",
        imageUrl: null,
        capturedAt: "2026-08-01 08:00:00",
        meatType: "pork",
        classification: "fresh",
        confidenceLabel: "90%",
        location: "East Market",
      },
    ],
  },
];

// commit 07
test("buildReportDocDefinition renders inspector graph section as SVG content for dti template", async () => {
  const model: ReportDocumentModel = {
    organization: "dti",
    templateKey: "dti",
    kind: "inspector_daily",
    title: "Inspector Daily Report",
    subtitle: "Inspection Day: 2026-08-01",
    generatedAt: "Aug 1, 2026 4:00 PM",
    sections: inspectorEvidenceSections,
  };

  const docDefinition = await buildReportDocDefinition(model, {
    loadBrandAsset: async (path) => `mocked:${path}`,
  });

  // dti template renames report-graphs → "Operational Inspection Graphs" for inspector_daily
  const graphSection = findSectionBlock(
    docDefinition.content,
    "Operational Inspection Graphs",
  );

  assert.ok(
    graphSection,
    "expected a section titled 'Operational Inspection Graphs' in dti inspector PDF",
  );

  const svgs = collectNodeSvgs(graphSection);
  assert.equal(
    svgs.length,
    3,
    "expected 3 SVG charts in the DTI inspector graph section",
  );
  assert.ok(
    svgs.every((svg) => svg.includes("<svg")),
    "each SVG string must contain a <svg element",
  );

  const texts = collectNodeTexts(graphSection);
  assert.ok(texts.includes("Classification Breakdown"));
  assert.ok(texts.includes("Meat Type Breakdown"));
  assert.ok(texts.includes("Confidence by Hour"));
});

// commit 08
test("buildReportDocDefinition renders inspector graph section as SVG content for city_vet template", async () => {
  const model: ReportDocumentModel = {
    organization: "city_veterinary_office_olongapo",
    templateKey: "city_vet",
    kind: "inspector_daily",
    title: "Inspector Daily Report",
    subtitle: "Inspection Day: 2026-08-01",
    generatedAt: "Aug 1, 2026 4:00 PM",
    sections: inspectorEvidenceSections,
  };

  const docDefinition = await buildReportDocDefinition(model, {
    loadBrandAsset: async (path) => `mocked:${path}`,
  });

  // city_vet template renames report-graphs → "Veterinary Inspection Graphs" for inspector_daily
  const graphSection = findSectionBlock(
    docDefinition.content,
    "Veterinary Inspection Graphs",
  );

  assert.ok(
    graphSection,
    "expected a section titled 'Veterinary Inspection Graphs' in city_vet inspector PDF",
  );

  const svgs = collectNodeSvgs(graphSection);
  assert.equal(
    svgs.length,
    3,
    "expected 3 SVG charts in the City Vet inspector graph section",
  );
  assert.ok(svgs.every((svg) => svg.includes("<svg")));
});

// commit 09
test("buildReportDocDefinition renders inspector graph section as SVG content for gcccs template", async () => {
  const model: ReportDocumentModel = {
    organization: "gordon_college_ccs",
    templateKey: "gcccs",
    kind: "inspector_daily",
    title: "Inspector Daily Report",
    subtitle: "Inspection Day: 2026-08-01",
    generatedAt: "Aug 1, 2026 4:00 PM",
    sections: inspectorEvidenceSections,
  };

  const docDefinition = await buildReportDocDefinition(model, {
    loadBrandAsset: async (path) => `mocked:${path}`,
  });

  // gcccs template renames report-graphs → "Technical Inspection Graphs" for inspector_daily
  const graphSection = findSectionBlock(
    docDefinition.content,
    "Technical Inspection Graphs",
  );

  assert.ok(
    graphSection,
    "expected a section titled 'Technical Inspection Graphs' in gcccs inspector PDF",
  );

  const svgs = collectNodeSvgs(graphSection);
  assert.equal(
    svgs.length,
    3,
    "expected 3 SVG charts in the GCCCS inspector graph section",
  );
  assert.ok(svgs.every((svg) => svg.includes("<svg")));
});

// commit 10
test("buildReportDocDefinition shows emptyState text when all inspector chart points are zero", async () => {
  const emptyGraphModel: ReportDocumentModel = {
    organization: "dti",
    templateKey: "dti",
    kind: "inspector_daily",
    title: "Inspector Daily Report",
    subtitle: "Inspection Day: 2026-08-01",
    generatedAt: "Aug 1, 2026 4:00 PM",
    sections: [
      inspectorEvidenceSections[0],
      {
        id: "report-graphs",
        title: "Report Graphs",
        charts: [
          {
            id: "classification-breakdown",
            title: "Classification Breakdown",
            kind: "bar",
            emptyState: "No inspections for this day",
            points: [],
          },
          {
            id: "meat-type-breakdown",
            title: "Meat Type Breakdown",
            kind: "bar",
            emptyState: "No inspections for this day",
            points: [],
          },
          {
            id: "confidence-by-hour",
            title: "Confidence by Hour",
            kind: "line",
            emptyState: "No inspections for this day",
            points: [],
          },
        ],
      },
      inspectorEvidenceSections[2],
    ],
  };

  const docDefinition = await buildReportDocDefinition(emptyGraphModel, {
    loadBrandAsset: async (path) => `mocked:${path}`,
  });

  const graphSection = findSectionBlock(
    docDefinition.content,
    "Operational Inspection Graphs",
  );

  assert.ok(graphSection, "graph section must still appear even with empty data");
  // no SVGs — all charts fall back to emptyState text
  assert.deepEqual(collectNodeSvgs(graphSection), []);
  assert.match(
    JSON.stringify(graphSection),
    /No inspections for this day/,
  );
});
