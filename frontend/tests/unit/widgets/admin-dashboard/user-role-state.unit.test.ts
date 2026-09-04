import assert from "node:assert/strict";
import test from "node:test";

import { buildRoleChangeRequest } from "../../../../src/widgets/admin-dashboard/model/use-user-actions";

test("role changes require a trimmed developer password", () => {
  assert.deepEqual(
    buildRoleChangeRequest({
      isDeveloper: true,
      currentRole: "user",
      nextRole: "admin",
      password: " secret ",
    }),
    { role: "admin", password: "secret" },
  );
  assert.throws(
    () => buildRoleChangeRequest({
      isDeveloper: true,
      currentRole: "user",
      nextRole: "admin",
      password: "",
    }),
    /developer password is required/i,
  );
});

test("unchanged and non-developer edits do not call role mutation", () => {
  assert.equal(buildRoleChangeRequest({
    isDeveloper: true, currentRole: "admin", nextRole: "admin", password: "",
  }), null);
  assert.equal(buildRoleChangeRequest({
    isDeveloper: false, currentRole: "user", nextRole: "admin", password: "secret",
  }), null);
});
