import assert from "node:assert/strict";
import test from "node:test";
import { getTemplateKeyForOrganization } from "../../src/lib/reports/pdf/assets";

test("maps report organizations to stable template keys", () => {
  assert.equal(getTemplateKeyForOrganization("gordon_college_ccs"), "gcccs");
  assert.equal(getTemplateKeyForOrganization("dti"), "dti");
  assert.equal(
    getTemplateKeyForOrganization("city_veterinary_office_olongapo"),
    "city_vet",
  );
});
