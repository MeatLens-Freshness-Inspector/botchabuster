import { expect, test } from "@playwright/test";

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

test("lists chat contacts with bearer authentication", async ({ page }) => {
  let capturedUrl = "";
  let authorization = "";

  await page.route("**/api/user-chat/contacts", async (route) => {
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
    const { userChatClient } = await import("/src/integrations/api/UserChatClient.ts");
    await userChatClient.getContacts();
  });

  expect(capturedUrl).toContain("/api/user-chat/contacts");
  expect(authorization).toBe("Bearer session-token");
});

test("posts chat message payload with recipient and content", async ({ page }) => {
  let requestBody = "";
  let authorization = "";

  await page.route("**/api/user-chat/messages", async (route) => {
    requestBody = route.request().postData() ?? "";
    authorization = route.request().headers()["authorization"] ?? "";
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        id: "msg-1",
        sender_id: "admin-1",
        recipient_id: "user-1",
        content: "Hello user.",
        created_at: "2026-05-17T08:00:00.000Z",
      }),
    });
  });

  await page.goto("/");
  await page.evaluate(async () => {
    const { userChatClient } = await import("/src/integrations/api/UserChatClient.ts");
    await userChatClient.sendMessage("user-1", "Hello user.");
  });

  expect(authorization).toBe("Bearer session-token");
  expect(requestBody).toContain("\"recipientId\":\"user-1\"");
  expect(requestBody).toContain("\"content\":\"Hello user.\"");
});
