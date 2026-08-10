import assert from "node:assert/strict";
import { test } from "node:test";
import { SignInUser } from "../../../src/modules/auth/application/signIn/SignInUser";
import type { AuthGateway } from "../../../src/modules/auth/domain/ports/AuthGateway";

test("SignInUser trims the email and delegates credentials to the auth port", async () => {
  const calls: Array<{ email: string; password: string }> = [];
  const gateway: AuthGateway = {
    signIn: async (email, password) => {
      calls.push({ email, password });
      return { id: "user-1", email };
    },
  };

  const result = await new SignInUser(gateway).execute({
    email: "  user@example.com ",
    password: "secret",
  });

  assert.deepEqual(calls, [{ email: "user@example.com", password: "secret" }]);
  assert.deepEqual(result, { id: "user-1", email: "user@example.com" });
});

test("SignInUser rejects empty credentials before calling the port", async () => {
  let called = false;
  const gateway: AuthGateway = {
    signIn: async () => {
      called = true;
      return { id: "user-1", email: null };
    },
  };

  await assert.rejects(
    () => new SignInUser(gateway).execute({ email: "", password: "secret" }),
    /email is required/i,
  );
  assert.equal(called, false);
});
