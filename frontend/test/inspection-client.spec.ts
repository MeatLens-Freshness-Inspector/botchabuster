import { test, expect } from "@playwright/test";

const SESSION_STORAGE_KEY = "meatlens-auth-session";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((storageKey) => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "meatlens-auth-user",
      JSON.stringify({
        id: "user-1",
        email: "inspector@example.com",
      })
    );
    window.sessionStorage.clear();
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        access_token: "session-token",
      })
    );
  }, SESSION_STORAGE_KEY);

  await page.route("**/api/analysis/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok" }),
    });
  });
});

test("sends the current session token and scopes inspection lists to the signed-in user by default", async ({ page }) => {
  let capturedUrl = "";
  let authorization = "";

  await page.route("**/api/inspections?**", async (route) => {
    capturedUrl = route.request().url();
    authorization = route.request().headers()["authorization"] ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.goto("/");
  await page.evaluate(async () => {
    const { inspectionClient } = await import("/src/integrations/api/InspectionClient.ts");
    await inspectionClient.getAll(25, 5);
  });

  expect(capturedUrl).toContain("/api/inspections?limit=25&offset=5&scope=mine");
  expect(authorization).toBe("Bearer session-token");
});

test("allows admin pages to explicitly request the full inspection dataset", async ({ page }) => {
  let capturedUrl = "";
  let authorization = "";

  await page.route("**/api/inspections?**", async (route) => {
    capturedUrl = route.request().url();
    authorization = route.request().headers()["authorization"] ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.goto("/");
  await page.evaluate(async () => {
    const { inspectionClient } = await import("/src/integrations/api/InspectionClient.ts");
    await inspectionClient.getAll(200, 0, "all");
  });

  expect(capturedUrl).toContain("/api/inspections?limit=200&offset=0&scope=all");
  expect(authorization).toBe("Bearer session-token");
});

test("scopes inspection detail lookups to the signed-in user by default", async ({ page }) => {
  let capturedUrl = "";
  let authorization = "";

  await page.route("**/api/inspections/inspection-3?**", async (route) => {
    capturedUrl = route.request().url();
    authorization = route.request().headers()["authorization"] ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "inspection-3",
        user_id: "user-1",
        meat_type: "pork",
        classification: "fresh",
        confidence_score: 92,
        flagged_deviations: [],
        explanation: null,
        image_url: null,
        location: "North Market",
        inspector_notes: null,
        created_at: "2026-04-19T02:55:00.000Z",
        updated_at: "2026-04-19T02:55:00.000Z",
      }),
    });
  });

  await page.goto("/");
  await page.evaluate(async () => {
    const { inspectionClient } = await import("/src/integrations/api/InspectionClient.ts");
    await inspectionClient.getById("inspection-3");
  });

  expect(capturedUrl).toContain("/api/inspections/inspection-3?scope=mine");
  expect(authorization).toBe("Bearer session-token");
});

test("scopes inspection statistics to the signed-in user by default", async ({ page }) => {
  let capturedUrl = "";
  let authorization = "";

  await page.route("**/api/inspections/stats?**", async (route) => {
    capturedUrl = route.request().url();
    authorization = route.request().headers()["authorization"] ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ total: 0, byClassification: {} }),
    });
  });

  await page.goto("/");
  await page.evaluate(async () => {
    const { inspectionClient } = await import("/src/integrations/api/InspectionClient.ts");
    await inspectionClient.getStatistics();
  });

  expect(capturedUrl).toContain("/api/inspections/stats?scope=mine");
  expect(authorization).toBe("Bearer session-token");
});

test("clears cached auth and surfaces a re-login error when inspections returns unauthorized", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "meatlens-auth-user",
      JSON.stringify({
        id: "user-1",
        email: "inspector@example.com",
      })
    );
  });

  await page.route("**/api/inspections?**", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Invalid or expired access token" }),
    });
  });

  await page.goto("/");
  const result = await page.evaluate(async () => {
    let authExpiredEvents = 0;
    window.addEventListener("meatlens:auth-expired", () => {
      authExpiredEvents += 1;
    });

    const { inspectionClient } = await import("/src/integrations/api/InspectionClient.ts");

    try {
      await inspectionClient.getAll();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        authExpiredEvents,
        storedUser: window.localStorage.getItem("meatlens-auth-user"),
        storedSession: window.sessionStorage.getItem("meatlens-auth-session"),
        legacyStoredSession: window.localStorage.getItem("meatlens-auth-session"),
      };
    }
  });

  expect(result.ok).toBe(false);
  expect(result.message).toBe("Session expired. Please sign in again.");
  expect(result.authExpiredEvents).toBe(1);
  expect(result.storedUser).toBeNull();
  expect(result.storedSession).toBeNull();
  expect(result.legacyStoredSession).toBeNull();
});
