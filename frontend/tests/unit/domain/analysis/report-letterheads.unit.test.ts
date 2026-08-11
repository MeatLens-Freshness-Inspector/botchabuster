import assert from "node:assert/strict";
import test from "node:test";
import {
  getReportLetterheadAssetPath,
  getReportLetterheadAssetUrl,
} from "../../../../src/features/reports";

test("maps each report organization to the correct letterhead asset", () => {
  assert.equal(
    getReportLetterheadAssetPath("dti"),
    "/letterheads/DTI zambales letterhead.pdf",
  );
  assert.equal(
    getReportLetterheadAssetPath("city_veterinary_office_olongapo"),
    "/letterheads/City Vet letterhead.pdf",
  );
  assert.equal(
    getReportLetterheadAssetPath("gordon_college_ccs"),
    "/letterheads/gcccs letterhead new.pdf",
  );
});

test("builds absolute letterhead asset urls for export html", () => {
  assert.equal(
    getReportLetterheadAssetUrl("city_veterinary_office_olongapo", "https://example.com"),
    "https://example.com/letterheads/City%20Vet%20letterhead.pdf",
  );
});
