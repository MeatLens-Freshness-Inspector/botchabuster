import assert from "node:assert/strict";
import test from "node:test";
import { getOrganizationReportTemplate } from "../../../../src/lib/reports/templates";

const sampleModel = {
  organization: "gordon_college_ccs" as const,
  templateKey: "gcccs" as const,
  kind: "admin_range" as const,
  title: "Administrative Report",
  subtitle: "Range: 2026-08-01 to 2026-08-02",
  generatedAt: "Aug 2, 2026 10:15 AM",
  sections: [
    {
      id: "org-overview",
      title: "Organization Overview",
      metrics: [{ label: "Total Inspections", value: "3" }],
    },
    {
      id: "meat-summary",
      title: "Meat Inspection Summary",
      metrics: [{ label: "Average Confidence", value: "91%" }],
    },
  ],
};

test("gcccs template places the technical overview before meat sections", () => {
  const template = getOrganizationReportTemplate("gcccs");
  const sections = template.buildSections(sampleModel);

  assert.equal(sections[0].id, "org-overview");
  assert.equal(sections[0].title, "Technical and System Overview");
  assert.ok(sections.some((section) => section.id === "meat-summary"));
});
