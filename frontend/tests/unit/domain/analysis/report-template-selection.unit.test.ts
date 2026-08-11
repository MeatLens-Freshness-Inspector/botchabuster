import assert from "node:assert/strict";
import test from "node:test";
import { getOrganizationReportTemplate } from "../../../../src/features/reports/lib/templates";

const sampleModel = {
  organization: "gordon_college_ccs" as const,
  templateKey: "gcccs" as const,
  kind: "admin_range" as const,
  title: "Administrative Report",
  subtitle: "Range: 2026-08-01 to 2026-08-02",
  generatedAt: "Aug 2, 2026 10:15 AM",
  sections: [
    {
      id: "meat-summary",
      title: "Meat Inspection Summary",
      metrics: [{ label: "Average Confidence", value: "91%" }],
    },
    {
      id: "pork-gallery",
      title: "Pork Inspection Evidence",
      inspectionEvidence: [
        {
          id: "pork-1",
          imageUrl: "https://example.com/pork-1.jpg",
          capturedAt: "2026-08-02 10:00:00",
          meatType: "pork",
          classification: "warning",
          confidenceLabel: "88%",
          location: "East Market",
        },
      ],
      evidenceLayout: "photo-first" as const,
    },
    {
      id: "report-graphs",
      title: "Report Graphs",
      charts: [
        {
          id: "classification-breakdown",
          title: "Classification Breakdown",
          kind: "bar" as const,
          emptyState: "No data for selected range",
          points: [{ label: "warning", value: 1 }],
        },
      ],
    },
    {
      id: "org-overview",
      title: "Organization Overview",
      metrics: [{ label: "Total Inspections", value: "3" }],
    },
    {
      id: "meat-detail",
      title: "Inspection Detail",
      tables: [
        {
          title: "Inspection Detail",
          columns: ["Created"],
          rows: [["2026-08-02 10:00:00"]],
        },
      ],
    },
  ],
};

test("gcccs admin template keeps the report technical-first and removes the pork gallery section", () => {
  const template = getOrganizationReportTemplate("gcccs");
  const sections = template.buildSections(sampleModel);

  assert.deepEqual(
    sections.map((section) => section.id),
    ["org-overview", "report-graphs", "meat-summary", "meat-detail"],
  );
  assert.equal(sections[0].title, "Technical and System Overview");
  assert.equal(sections[1].title, "Technical Inspection Graphs");
  assert.ok(!sections.some((section) => section.id === "pork-gallery"));
});
