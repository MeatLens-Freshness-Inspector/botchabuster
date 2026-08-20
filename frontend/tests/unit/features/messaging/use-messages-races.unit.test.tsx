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
  return null;
}

const contacts: UserChatContact[] = [
  {
    id: "admin-a",
    full_name: "Admin A",
    email: "a@example.com",
    inspector_code: null,
    location: null,
    role: "admin",
    last_message_preview: null,
    last_message_at: null,
  },
  {
    id: "admin-b",
    full_name: "Admin B",
    email: "b@example.com",
    inspector_code: null,
    location: null,
    role: "admin",
    last_message_preview: null,
    last_message_at: null,
  },
];

const messageForB: UserChatMessage = {
  id: "message-b",
  sender_id: "admin-b",
  recipient_id: "user-1",
  content: "Arrived during selection",
  created_at: "2026-08-20T12:00:00.000Z",
};

function baseOptions(overrides: Partial<Parameters<typeof useMessagesModel>[0]> = {}) {
  let streamMessage: ((message: UserChatMessage) => void) | null = null;
  const options: Parameters<typeof useMessagesModel>[0] = {
    auth: {
      user: { id: "user-1" },
      isAdmin: false,
      isOnlineAuthenticated: true,
    },
    isDesktop: false,
    client: {
      async getContacts() {
        return contacts;
      },
      async getMessages() {
        return [];
      },
      async sendMessage() {
        return messageForB;
      },
    },
    openStream: async ({ signal, onMessage }) => {
      streamMessage = onMessage;
      await new Promise<void>((resolve) => {
        if (signal.aborted) resolve();
        else signal.addEventListener("abort", () => resolve(), { once: true });
      });
    },
    ...overrides,
  };
  return { options, emit(message: UserChatMessage) { streamMessage?.(message); } };
}

test("does not clear an event delivered in the same turn as contact selection", async () => {
  const dom = installDom();
  const root = createRoot(dom.container);
  const workflowRef: { current: MessagesWorkflow | null } = { current: null };
  const { options, emit } = baseOptions();

  try {
    await act(async () => root.render(<Harness workflowRef={workflowRef} options={options} />));
    await flush();
    await act(async () => {
      workflowRef.current!.handleSelectContact("admin-b");
      emit(messageForB);
    });
    await flush();
    assert.equal(workflowRef.current!.selectedContactId, "admin-b");
    assert.deepEqual(workflowRef.current!.messages.map(({ id }) => id), ["message-b"]);
  } finally {
    await act(async () => root.unmount());
    dom.cleanup();
  }
});

test("reconciles a stream event that arrives before the contacts snapshot", async () => {
  const dom = installDom();
  const root = createRoot(dom.container);
  const workflowRef: { current: MessagesWorkflow | null } = { current: null };
  let resolveContacts: ((value: UserChatContact[]) => void) | null = null;
  const { options, emit } = baseOptions({
    client: {
      async getContacts() {
        return new Promise<UserChatContact[]>((resolve) => { resolveContacts = resolve; });
      },
      async getMessages() {
        return [];
      },
      async sendMessage() {
        return messageForB;
      },
    },
  });

  try {
    await act(async () => root.render(<Harness workflowRef={workflowRef} options={options} />));
    await flush();
    emit(messageForB);
    await act(async () => resolveContacts?.(contacts));
    await flush();
    assert.equal(workflowRef.current!.contacts.find(({ id }) => id === "admin-b")?.last_message_preview, messageForB.content);
  } finally {
    await act(async () => root.unmount());
    dom.cleanup();
  }
});

test("ignores an authenticated contacts response that resolves after logout", async () => {
  const dom = installDom();
  const root = createRoot(dom.container);
  const workflowRef: { current: MessagesWorkflow | null } = { current: null };
  let resolveContacts: ((value: UserChatContact[]) => void) | null = null;
  const { options } = baseOptions({
    client: {
      async getContacts() {
        return new Promise<UserChatContact[]>((resolve) => { resolveContacts = resolve; });
      },
      async getMessages() {
        return [];
      },
      async sendMessage() {
        return messageForB;
      },
    },
  });

  try {
    await act(async () => root.render(<Harness workflowRef={workflowRef} options={options} />));
    await flush();
    const loggedOutOptions = {
      ...options,
      auth: { ...options.auth, user: null, isOnlineAuthenticated: false },
    };
    await act(async () => root.render(<Harness workflowRef={workflowRef} options={loggedOutOptions} />));
    await flush();
    await act(async () => resolveContacts?.(contacts));
    await flush();
    assert.equal(workflowRef.current!.isOnlineAuthenticated, false);
    assert.deepEqual(workflowRef.current!.contacts, []);
  } finally {
    await act(async () => root.unmount());
    dom.cleanup();
  }
});

test("ignores a send response that resolves after logout", async () => {
  const dom = installDom();
  const root = createRoot(dom.container);
  const workflowRef: { current: MessagesWorkflow | null } = { current: null };
  let resolveSend!: (message: UserChatMessage) => void;
  const base = baseOptions();
  const options = {
    ...base.options,
    client: {
      ...base.options.client,
      sendMessage: () => new Promise<UserChatMessage>((resolve) => { resolveSend = resolve; }),
    },
  };
  try {
    await act(async () => root.render(<Harness workflowRef={workflowRef} options={options} />));
    await flush();
    await act(async () => {
      workflowRef.current!.handleSelectContact("admin-b");
      workflowRef.current!.setDraftMessage("late");
      await Promise.resolve();
    });
    const pending = workflowRef.current!.handleSendMessage();
    await act(async () => root.render(<Harness workflowRef={workflowRef} options={{ ...options, auth: { ...options.auth, isOnlineAuthenticated: false } }} />));
    resolveSend(messageForB);
    await act(async () => pending);
    await flush();
    assert.deepEqual(workflowRef.current!.messages, []);
  } finally {
    await act(async () => root.unmount());
    dom.cleanup();
  }
});
