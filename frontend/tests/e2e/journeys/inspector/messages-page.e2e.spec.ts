import { expect, test, type Page, type Route } from "@playwright/test";
import {
  decryptEncryptedRouteRequest,
  fulfillEncryptedRoute,
} from "../../../support/fixtures/transport";

import { mockCommonApi, seedSignedInSession } from "../../../support/fixtures/app";

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

async function installMessageStreamMock(page: Page) {
  await page.addInitScript(() => {
    type StreamTestWindow = typeof window & {
      __emitUserChatEvent?: (event: string, data: unknown) => void;
      __userChatStreamOpenCount?: number;
    };
    const testWindow = window as StreamTestWindow;
    const originalFetch = window.fetch.bind(window);
    const originalCrypto = window.crypto;
    const originalSubtle = originalCrypto.subtle;
    const originalEncrypt = originalSubtle.encrypt.bind(originalSubtle);
    const encoder = new TextEncoder();
    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
    let latestAesKey: CryptoKey | null = null;
    let activeStreamKey: CryptoKey | null = null;

    const trackedSubtle = new Proxy(originalSubtle, {
      get(target, property) {
        if (property === "generateKey") {
          return async (
            algorithm: AlgorithmIdentifier,
            extractable: boolean,
            keyUsages: KeyUsage[],
          ) => {
            const generated = await originalSubtle.generateKey(algorithm, extractable, keyUsages);
            if (
              typeof algorithm === "object"
              && algorithm !== null
              && "name" in algorithm
              && algorithm.name === "AES-GCM"
              && generated instanceof CryptoKey
            ) {
              latestAesKey = generated;
            }
            return generated;
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: new Proxy(originalCrypto, {
        get(target, property) {
          if (property === "subtle") return trackedSubtle;
          const value = Reflect.get(target, property, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      }),
    });

    const encodeBase64Url = (value: Uint8Array) =>
      btoa(String.fromCharCode(...value))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

    const encryptFrame = async (event: string, data: unknown, key: CryptoKey) => {
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
      const plaintext = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      const ciphertext = new Uint8Array(await originalEncrypt(
        { name: "AES-GCM", iv, additionalData: encoder.encode("GET /api/user-chat/events"), tagLength: 128 },
        key,
        plaintext,
      ));
      const envelope = {
        version: 1,
        algorithm: "A256GCM",
        keyId: "e2e-v1",
        iv: encodeBase64Url(iv),
        ciphertext: encodeBase64Url(ciphertext),
      };
      streamController?.enqueue(encoder.encode(`data: ${JSON.stringify(envelope)}\n\n`));
    };

    testWindow.__userChatStreamOpenCount = 0;
    testWindow.__emitUserChatEvent = (event, data) => {
      if (activeStreamKey) void encryptFrame(event, data, activeStreamKey);
    };
    window.fetch = async (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
      if (url.pathname !== "/api/user-chat/events") return originalFetch(input, init);

      testWindow.__userChatStreamOpenCount = (testWindow.__userChatStreamOpenCount ?? 0) + 1;
      if (!latestAesKey) throw new Error("Missing E2E transport AES key for chat stream");
      activeStreamKey = latestAesKey;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller;
          void encryptFrame("status", { state: "connected" }, activeStreamKey as CryptoKey);
          init?.signal?.addEventListener("abort", () => {
            if (streamController === controller) streamController = null;
            activeStreamKey = null;
            try {
              controller.close();
            } catch {
              // The stream may already be closed by page teardown.
            }
          }, { once: true });
        },
      });
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    };
  });
}

async function mockMessagesApi(page: Page) {
  const api = {
    contactsRequests: 0,
    messageRequests: [] as string[],
    sendRequests: 0,
  };

  await page.route("**/api/user-chat/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === "/api/user-chat/contacts" && request.method() === "GET") {
      api.contactsRequests += 1;
      await fulfillEncryptedRoute(route, jsonResponse(contacts));
      return;
    }

    const messageMatch = path.match(/^\/api\/user-chat\/messages\/([^/]+)$/);
    if (messageMatch && request.method() === "GET") {
      const counterpartyId = decodeURIComponent(messageMatch[1]);
      api.messageRequests.push(counterpartyId);
      await fulfillEncryptedRoute(route,
        jsonResponse(messagesByContact[counterpartyId as keyof typeof messagesByContact] ?? []),
      );
      return;
    }

    if (path === "/api/user-chat/messages" && request.method() === "POST") {
      api.sendRequests += 1;
      const body = JSON.parse(decryptEncryptedRouteRequest(request).postData || "{}") as {
        recipientId: string;
        content: string;
      };
      await fulfillEncryptedRoute(route, jsonResponse({
        id: "message-sent",
        sender_id: "user-1",
        recipient_id: body.recipientId,
        content: body.content,
        created_at: "2026-07-02T04:00:00.000Z",
      }, 201));
      return;
    }

    await fulfillEncryptedRoute(route, jsonResponse({ error: "Unhandled user-chat route", path }, 404));
  });

  return api;
}

async function openMessagesPage(
  page: Page,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize(viewport);
  await installMessageStreamMock(page);
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

test("desktop receives realtime messages without polling and deduplicates sent echoes", async ({ page }) => {
  const api = await openMessagesPage(page, { width: 1280, height: 900 });
  await expect(page.getByRole("status")).toHaveText("Live updates connected");
  await expect.poll(() => api.messageRequests.length).toBe(1);
  expect(api.contactsRequests).toBe(1);

  const realtimeMessage = {
    id: "message-realtime",
    sender_id: "admin-1",
    recipient_id: "user-1",
    content: "Realtime arrival",
    created_at: "2026-07-02T03:30:00.000Z",
  };
  await page.evaluate((message) => {
    (window as typeof window & { __emitUserChatEvent?: (event: string, data: unknown) => void })
      .__emitUserChatEvent?.("message", message);
  }, realtimeMessage);
  await expect(
    page.locator("p.whitespace-pre-wrap").filter({ hasText: /^Realtime arrival$/ }),
  ).toBeVisible();

  await page.waitForTimeout(6_500);
  expect(api.contactsRequests).toBe(1);
  expect(api.messageRequests).toEqual(["admin-1"]);

  await page.getByPlaceholder(/Message Chief Admin/i).fill("Sent once");
  await page.getByRole("button", { name: /^send$/i }).click();
  const sentMessageBubble = page.locator("p.whitespace-pre-wrap").filter({ hasText: /^Sent once$/ });
  await expect(sentMessageBubble).toBeVisible();
  expect(api.sendRequests).toBe(1);
  expect(api.contactsRequests).toBe(1);
  expect(api.messageRequests).toEqual(["admin-1"]);

  await page.evaluate(() => {
    (window as typeof window & { __emitUserChatEvent?: (event: string, data: unknown) => void })
      .__emitUserChatEvent?.("message", {
        id: "message-sent",
        sender_id: "user-1",
        recipient_id: "admin-1",
        content: "Sent once",
        created_at: "2026-07-02T04:00:00.000Z",
      });
  });
  await expect(sentMessageBubble).toHaveCount(1);

  await page.getByRole("button", { name: /refresh messages/i }).click();
  await expect.poll(() => api.contactsRequests).toBe(2);
  await expect.poll(() => api.messageRequests.length).toBe(2);

  await page.evaluate(() => {
    (window as typeof window & { __emitUserChatEvent?: (event: string, data: unknown) => void })
      .__emitUserChatEvent?.("status", { state: "realtime_unavailable" });
  });
  await expect(page.getByRole("status")).toHaveText("Live updates disconnected");
  await expect(page.getByRole("button", { name: /^reconnect$/i })).toBeVisible();
});
