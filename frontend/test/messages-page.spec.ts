import { expect, test, type Page, type Route } from "@playwright/test";

import { mockCommonApi, seedSignedInSession } from "./helpers/app";

const contacts = [
  {
    id: "admin-1",
    full_name: "Chief Admin",
    email: "chief@example.com",
    inspector_code: null,
    location: "Central Office",
    role: "admin" as const,
    last_message_preview: "Need inspection support?",
    last_message_at: "2026-07-02T03:00:00.000Z",
  },
  {
    id: "user-2",
    full_name: "Blair",
    email: "blair@example.com",
    inspector_code: "INSP-002",
    location: "South Market",
    role: "user" as const,
    last_message_preview: "Can you review this sample?",
    last_message_at: "2026-07-02T02:30:00.000Z",
  },
];

const messagesByContact = {
  "admin-1": [
    {
      id: "message-1",
      sender_id: "admin-1",
      recipient_id: "user-1",
      content: "Need inspection support?",
      created_at: "2026-07-02T03:00:00.000Z",
    },
  ],
  "user-2": [
    {
      id: "message-2",
      sender_id: "user-1",
      recipient_id: "user-2",
      content: "Can you review this sample?",
      created_at: "2026-07-02T02:30:00.000Z",
    },
  ],
} as const;

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

async function mockMessagesApi(page: Page) {
  const messageRequests: string[] = [];

  await page.route("**/api/user-chat/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === "/api/user-chat/contacts" && request.method() === "GET") {
      await route.fulfill(jsonResponse(contacts));
      return;
    }

    const messageMatch = path.match(/^\/api\/user-chat\/messages\/([^/]+)$/);
    if (messageMatch && request.method() === "GET") {
      const counterpartyId = decodeURIComponent(messageMatch[1]);
      messageRequests.push(counterpartyId);
      await route.fulfill(
        jsonResponse(messagesByContact[counterpartyId as keyof typeof messagesByContact] ?? []),
      );
      return;
    }

    await route.fulfill(jsonResponse({ error: "Unhandled user-chat route", path }, 404));
  });

  return { messageRequests };
}

async function openMessagesPage(
  page: Page,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize(viewport);
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });
  const api = await mockMessagesApi(page);

  await page.goto("/messages");
  await expect(page.getByRole("heading", { name: /^messages$/i })).toBeVisible();

  return api;
}

test("mobile opens on the list screen and does not fetch a thread until the user taps a contact", async ({ page }) => {
  const api = await openMessagesPage(page, { width: 390, height: 844 });

  await expect(page.getByRole("heading", { name: /contact directory/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /conversation thread/i })).toHaveCount(0);
  expect(api.messageRequests).toEqual([]);

  await page.getByRole("button", { name: /chief admin/i }).click();

  await expect(page.getByRole("heading", { name: /conversation thread/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^messages$/i })).toHaveCount(0);
  await expect.poll(() => api.messageRequests.length).toBe(1);
  expect(api.messageRequests[0]).toBe("admin-1");
  await expect(
    page.locator("p.whitespace-pre-wrap").filter({ hasText: "Need inspection support?" }),
  ).toBeVisible();
});

test("mobile thread back returns to the list screen without leaving the route", async ({ page }) => {
  const api = await openMessagesPage(page, { width: 390, height: 844 });

  await page.getByRole("button", { name: /chief admin/i }).click();
  await expect.poll(() => api.messageRequests.length).toBe(1);

  await page.getByRole("button", { name: /back to contacts/i }).click();

  await expect(page.getByRole("heading", { name: /contact directory/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^messages$/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /conversation thread/i })).toHaveCount(0);
  await expect(page).toHaveURL(/\/messages$/);
});

test("desktop still auto-selects the first contact and loads its thread on first render", async ({ page }) => {
  const api = await openMessagesPage(page, { width: 1280, height: 900 });

  await expect(page.getByRole("heading", { name: /contact directory/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /conversation thread/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^messages$/i })).toBeVisible();
  await expect.poll(() => api.messageRequests.length).toBe(1);
  expect(api.messageRequests[0]).toBe("admin-1");
  await expect(
    page.locator("p.whitespace-pre-wrap").filter({ hasText: "Need inspection support?" }),
  ).toBeVisible();
});
