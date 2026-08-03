import assert from "node:assert/strict";
import test from "node:test";

import { getOrganizationReportTemplate } from "../../../../src/lib/reports/templates";
import type { ReportDocumentModel } from "../../../../src/lib/reports/types";

const sampleInspectorModel: ReportDocumentModel = {
  organization: "dti",
  templateKey: "dti",
  kind: "inspector_daily",
  title: "Inspector Daily Report",
  subtitle: "Inspection Day: 2026-08-01",
  generatedAt: "Aug 2, 2026 5:00 PM",
  sections: [
    {
      id: "meat-summary",
      title: "Meat Inspection Summary",
      metrics: [{ label: "Total Inspections", value: "1" }],
    },
    {
      id: "meat-detail",
      title: "Daily Inspection Evidence",
      inspectionEvidence: [
        {
          id: "inspection-1",
          imageUrl: "https://example.com/unsegmented.jpg",
          capturedAt: "2026-08-01 08:05:30",
          meatType: "pork",
          classification: "fresh",
          confidenceLabel: "88%",
          location: "East Market",
        },
      ],
    },
  ],
};

test("dti inspector template keeps photo-first evidence and renames the evidence section", () => {
  const sections = getOrganizationReportTemplate("dti").buildSections(sampleInspectorModel);
  const detailSection = sections.find((section) => section.id === "meat-detail");

  assert.equal(detailSection?.title, "Market Field Inspection Evidence");
  assert.equal(detailSection?.evidenceLayout, "photo-first");
  assert.ok(detailSection?.inspectionEvidence);
});

test("city vet inspector template keeps photo-first evidence and renames the evidence section", () => {
  const cityVetModel: ReportDocumentModel = {
    ...sampleInspectorModel,
    organization: "city_veterinary_office_olongapo",
    templateKey: "city_vet",
  };

  const sections = getOrganizationReportTemplate("city_vet").buildSections(cityVetModel);
  const detailSection = sections.find((section) => section.id === "meat-detail");

  assert.equal(detailSection?.title, "Veterinary Inspection Evidence");
  assert.equal(detailSection?.evidenceLayout, "photo-first");
  assert.ok(detailSection?.inspectionEvidence);
});

test("gcccs inspector template converts normalized evidence into a compact technical table", () => {
  const gcccsModel: ReportDocumentModel = {
    ...sampleInspectorModel,
    organization: "gordon_college_ccs",
    templateKey: "gcccs",
  };

  const sections = getOrganizationReportTemplate("gcccs").buildSections(gcccsModel);
  const detailSection = sections.find((section) => section.id === "meat-detail");

  assert.equal(detailSection?.title, "Technical Inspection Evidence Log");
  assert.equal(detailSection?.inspectionEvidence, undefined);
  assert.equal(detailSection?.tables?.[0].rows[0][0], "2026-08-01 08:05:30");
});
