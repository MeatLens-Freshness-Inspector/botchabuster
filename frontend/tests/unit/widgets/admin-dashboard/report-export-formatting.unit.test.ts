import assert from "node:assert/strict";
import test from "node:test";

import {
  formatReportRowForExport,
} from "../../../../src/widgets/admin-dashboard/lib/dashboard";
import type { ReportRow } from "../../../../src/widgets/admin-dashboard/model/types";

const row: ReportRow = {
  id: "inspection-1",
  createdAt: "2026-08-01 08:00:00",
  capturedAt: null,
  inspector: "Adriaan Dimate",
  inspectorEmail: "adriaan@example.com",
  inspectorCode: "INSP-01",
  manualLocation: "East Market",
  location: "East Market",
  locationLatitude: 14.8386,
  locationLongitude: 120.2842,
  profileLocation: "East Market",
  meatType: "pork",
  classification: "fresh",
  confidenceScore: 93,
  decisionSource: "AI analysis",
  protocolSpoiledReason: "-",
  stallNumber: "12-A",
  certificateProof: "CERT-01",
  meatExpiryDate: "2026-08-03",
  storageCorrect: "Yes",
  lightColorCorrect: "Yes",
  lightColorObserved: "-",
  areaClean: "Yes",
  regulatoryCompliance: "Compliant",
  flaggedDeviations: "-",
  explanation: "Looks good",
  inspectorNotes: "Routine check",
  imageUrl: null,
};

test("formatReportRowForExport abbreviates the inspector without changing separate identity fields", () => {
  const exported = formatReportRowForExport(row);

  assert.equal(exported.inspector, "A. Dimate");
  assert.equal(exported.inspectorEmail, "adriaan@example.com");
  assert.equal(exported.inspectorCode, "INSP-01");
});
