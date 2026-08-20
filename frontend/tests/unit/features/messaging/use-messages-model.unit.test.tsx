import assert from "node:assert/strict";
import { test } from "node:test";
import React, { useEffect } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import type { UserChatContact, UserChatMessage } from "../../../../src/entities/message";
import {
  useMessagesModel,
  type MessagesWorkflow,
} from "../../../../src/features/messaging/model/use-messages-model";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost/",
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
  };
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  dom.window.Element.prototype.scrollIntoView = () => {};
  return {
    container: document.getElementById("root")!,
    cleanup() {
      Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: undefined });
      Object.defineProperty(globalThis, "window", { configurable: true, value: previous.window });
      Object.defineProperty(globalThis, "document", { configurable: true, value: previous.document });
      Object.defineProperty(globalThis, "navigator", { configurable: true, value: previous.navigator });
      dom.window.close();
    },
  };
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await new Promise<void>((resolve) => setImmediate(resolve));
  });
}

function Harness({ workflowRef, options }: {
  workflowRef: { current: MessagesWorkflow | null };
  options: Parameters<typeof useMessagesModel>[0];
}) {
  const workflow = useMessagesModel(options);
  useEffect(() => {
    workflowRef.current = workflow;
  }, [workflow, workflowRef]);
  return <span data-testid="messages">{workflow.messages.map(({ id }) => id).join(",")}</span>;
}

test("uses bounded snapshots and applies sends/stream echoes without follow-up GETs", async () => {
  const dom = installDom();
  const root = createRoot(dom.container);
  const workflowRef: { current: MessagesWorkflow | null } = { current: null };
  const calls = { contacts: 0, messages: 0, sends: 0, intervals: 0 };
  const originalSetInterval = window.setInterval;
  window.setInterval = ((...args: Parameters<typeof window.setInterval>) => {
    calls.intervals += 1;
    return originalSetInterval(...args);
  }) as typeof window.setInterval;
  const contact: UserChatContact = {
    id: "admin-1",
    full_name: "Admin One",
    email: "admin@example.com",
    inspector_code: null,
    location: null,
    role: "admin",
    last_message_preview: null,
    last_message_at: null,
  };
  const existing: UserChatMessage = {
    id: "message-1",
    sender_id: "admin-1",
    recipient_id: "user-1",
    content: "Existing",
    created_at: "2026-08-20T10:00:00.000Z",
  };
  const sent: UserChatMessage = {
    id: "message-2",
    sender_id: "user-1",
    recipient_id: "admin-1",
    content: "Sent once",
    created_at: "2026-08-20T11:00:00.000Z",
  };
  let streamMessage: ((message: UserChatMessage) => void) | null = null;
  const options: Parameters<typeof useMessagesModel>[0] = {
    auth: {
      user: { id: "user-1" },
      isAdmin: false,
      isOnlineAuthenticated: true,
    },
    isDesktop: true,
    client: {
      async getContacts() {
        calls.contacts += 1;
        return [contact];
      },
      async getMessages() {
        calls.messages += 1;
        return [existing];
      },
      async sendMessage() {
        calls.sends += 1;
        return sent;
      },
    },
    openStream: async ({ signal, onMessage, onStatus }) => {
      streamMessage = onMessage;
      onStatus("connected");
      await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }));
    },
  };

  try {
    await act(async () => root.render(<Harness workflowRef={workflowRef} options={options} />));
    await flush();
    await flush();
    assert.deepEqual({ contacts: calls.contacts, messages: calls.messages, intervals: calls.intervals }, {
      contacts: 1,
      messages: 1,
      intervals: 0,
    });

    await act(async () => {
      await workflowRef.current!.handleRefreshMessages();
    });
    assert.deepEqual({ contacts: calls.contacts, messages: calls.messages }, { contacts: 2, messages: 2 });

    await act(async () => workflowRef.current!.setDraftMessage("Sent once"));
    await act(async () => {
      await workflowRef.current!.handleSendMessage();
    });
    assert.deepEqual({ contacts: calls.contacts, messages: calls.messages, sends: calls.sends }, {
      contacts: 2,
      messages: 2,
      sends: 1,
    });
    assert.equal(workflowRef.current!.messages.filter(({ id }) => id === sent.id).length, 1);

    await act(async () => streamMessage?.(sent));
    assert.equal(workflowRef.current!.messages.filter(({ id }) => id === sent.id).length, 1);

    await act(async () => window.dispatchEvent(new window.Event("focus")));
    await flush();
    assert.deepEqual({ contacts: calls.contacts, messages: calls.messages }, { contacts: 3, messages: 3 });
  } finally {
    window.setInterval = originalSetInterval;
    await act(async () => root.unmount());
    dom.cleanup();
  }
});
