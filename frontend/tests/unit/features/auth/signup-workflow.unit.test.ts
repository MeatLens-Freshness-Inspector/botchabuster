import assert from "node:assert/strict";
import test from "node:test";
import { validateSignupState } from "../../../../src/features/auth/model/signup";

const validOrganization = (value: unknown): value is "dti" => value === "dti";

test("signup workflow reports the first unmet account requirement", () => {
  assert.equal(
    validateSignupState(
      { acceptedPrivacy: false, acceptedTerms: false, accessCode: "", reportOrganization: "" },
      validOrganization,
    ),
    "Please accept the Terms and Conditions before creating an account.",
  );
  assert.equal(
    validateSignupState(
      { acceptedPrivacy: true, acceptedTerms: true, accessCode: "code", reportOrganization: "dti" },
      validOrganization,
    ),
    null,
  );
});
