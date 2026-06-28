import assert from "node:assert/strict";
import test from "node:test";
import {
  LEGACY_REPORT_ORGANIZATION_FALLBACK,
  getReportOrganizationLabel,
  isReportOrganization,
  requireReportOrganization,
  resolveReportOrganization,
} from "../src/types/reportOrganization";

test("accepts only the supported report organization values", () => {
  assert.equal(isReportOrganization("dti"), true);
  assert.equal(isReportOrganization("city_veterinary_office_olongapo"), true);
  assert.equal(isReportOrganization("gordon_college_ccs"), true);
  assert.equal(isReportOrganization("DTI"), false);
  assert.equal(isReportOrganization(""), false);
  assert.equal(isReportOrganization(null), false);
});

test("requireReportOrganization throws for missing or invalid signup input", () => {
  assert.equal(requireReportOrganization("dti"), "dti");
  assert.throws(
    () => requireReportOrganization(undefined),
    /report organization must be one of/i,
  );
  assert.throws(
    () => requireReportOrganization("gcccs"),
    /report organization must be one of/i,
  );
});

test("resolveReportOrganization falls back to Gordon College CCS for legacy users", () => {
  assert.equal(resolveReportOrganization(undefined), LEGACY_REPORT_ORGANIZATION_FALLBACK);
  assert.equal(resolveReportOrganization("legacy-value"), LEGACY_REPORT_ORGANIZATION_FALLBACK);
  assert.equal(getReportOrganizationLabel(undefined), "Gordon College CCS");
  assert.equal(
    getReportOrganizationLabel("city_veterinary_office_olongapo"),
    "City Veterinary Office of Olongapo",
  );
});
