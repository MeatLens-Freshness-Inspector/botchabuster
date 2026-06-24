import { expect, test } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";

function createBuffer(values: number[]): ArrayBuffer {
  return Uint8Array.from(values).buffer;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const encoder = new TextEncoder();

    class FakePublicKeyCredential {}

    Object.defineProperty(window, "PublicKeyCredential", {
      configurable: true,
      value: FakePublicKeyCredential,
    });

    Object.defineProperty(FakePublicKeyCredential, "isUserVerifyingPlatformAuthenticatorAvailable", {
      configurable: true,
      value: async () => true,
    });

    Object.defineProperty(FakePublicKeyCredential, "isConditionalMediationAvailable", {
      configurable: true,
      value: async () => false,
    });

    Object.defineProperty(navigator, "credentials", {
      configurable: true,
      value: {
        async create() {
          const clientData = encoder.encode(JSON.stringify({
            type: "webauthn.create",
            challenge: "profile-passkey-challenge",
            origin: window.location.origin,
          }));

          return {
            id: "credential-profile-1",
            rawId: Uint8Array.from([10, 20, 30, 40]).buffer,
            type: "public-key",
            response: {
              clientDataJSON: clientData.buffer,
              attestationObject: Uint8Array.from([1, 2, 3, 4]).buffer,
              getAuthenticatorData: () => Uint8Array.from(new Array(37).fill(0)).buffer,
              getPublicKey: () => Uint8Array.from([48, 89, 48, 19, 6, 7, 42, 134]).buffer,
              getPublicKeyAlgorithm: () => -7,
              getTransports: () => ["internal"],
            },
            getClientExtensionResults: () => ({}),
          };
        },
        async get() {
          const clientData = encoder.encode(JSON.stringify({
            type: "webauthn.get",
            challenge: "login-passkey-challenge",
            origin: window.location.origin,
          }));

          return {
            id: "credential-login-1",
            rawId: Uint8Array.from([50, 60, 70, 80]).buffer,
            type: "public-key",
            response: {
              clientDataJSON: clientData.buffer,
              authenticatorData: Uint8Array.from(new Array(37).fill(0)).buffer,
              signature: Uint8Array.from([48, 2, 1, 1]).buffer,
              userHandle: null,
            },
            getClientExtensionResults: () => ({}),
          };
        },
      },
    });
  });
});

test("signs in with a passkey from the login page", async ({ page }) => {
  let optionsRequested = 0;
  let verificationPayload = "";

  await mockCommonApi(page, {
    userId: "user-1",
    isAdmin: false,
  });

  await page.route("**/api/auth/passkeys/authenticate/options", async (route) => {
    optionsRequested += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        challengeId: "login-passkey-flow",
        options: {
          challenge: "login-passkey-challenge",
          timeout: 60000,
          rpId: "localhost",
          userVerification: "required",
        },
      }),
    });
  });

  await page.route("**/api/auth/passkeys/authenticate/verify", async (route) => {
    verificationPayload = route.request().postData() ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "user-1",
          email: "inspector@example.com",
        },
        session: {
          access_token: "passkey-token",
          refresh_token: null,
          token_type: "bearer",
          expires_in: 28800,
          expires_at: Date.now() + 28_800_000,
        },
      }),
    });
  });

  await page.goto("/login");

  await expect(page.getByRole("button", { name: /sign in with passkey/i })).toBeVisible();
  await page.getByRole("button", { name: /sign in with passkey/i }).click();

  await expect(page).toHaveURL(/\/inspect$/);
  expect(optionsRequested).toBe(1);
  expect(verificationPayload).toContain("\"challengeId\":\"login-passkey-flow\"");
  expect(verificationPayload).toContain("\"id\":\"credential-login-1\"");

  const storedSession = await page.evaluate(() => window.localStorage.getItem("meatlens-auth-session"));
  expect(storedSession).toContain("passkey-token");
});

test("shows passkey management on the profile page and removes a registered device", async ({ page }) => {
  let deleteRequestUrl = "";

  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, {
    userId: "user-1",
    isAdmin: false,
  });

  await page.route("**/api/auth/passkeys", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            credentialId: "credential-profile-1",
            deviceLabel: "Office laptop",
            transports: ["internal"],
            createdAt: "2026-06-20T12:00:00.000Z",
            lastUsedAt: "2026-06-20T12:30:00.000Z",
            localDeviceReady: true,
          },
        ]),
      });
      return;
    }

    await route.fulfill({
      status: 405,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unexpected passkey method" }),
    });
  });

  await page.route("**/api/auth/passkeys/credential-profile-1", async (route) => {
    deleteRequestUrl = route.request().url();
    await route.fulfill({
      status: 204,
      body: "",
    });
  });

  await page.goto("/profile");

  await expect(page.getByRole("heading", { name: /passkeys and device unlock/i })).toBeVisible();
  await expect(page.getByText(/office laptop/i)).toBeVisible();

  await page.getByRole("button", { name: /remove office laptop/i }).click();

  expect(deleteRequestUrl).toContain("/api/auth/passkeys/credential-profile-1");
  await expect(page.getByText(/office laptop/i)).toHaveCount(0);
});
