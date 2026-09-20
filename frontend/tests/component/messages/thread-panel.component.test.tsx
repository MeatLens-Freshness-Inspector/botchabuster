import assert from "node:assert/strict";
import { createRef } from "react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { ThreadPanel } from "../../../src/widgets/messages";
import { formatTimestamp } from "../../../src/features/messaging/lib/formatters";

Object.assign(globalThis, { React });

function renderStatus(connectionStatus: "connecting" | "connected" | "disconnected") {
  return renderToStaticMarkup(
    <ThreadPanel
      currentUserId="user-1"
      selectedContact={null}
      messages={[]}
      isDesktop
      isLoadingMessages={false}
      isSendingMessage={false}
      draftMessage=""
      lastMessageRef={createRef<HTMLDivElement>()}
      connectionStatus={connectionStatus}
      onBack={() => {}}
      onDraftChange={() => {}}
      onSendMessage={() => {}}
      onReconnect={() => {}}
    />,
  );
}

test("thread panel exposes an accessible disconnected state and reconnect action", () => {
  const html = renderStatus("disconnected");
  assert.match(html, /role="status"/);
  assert.match(html, /Live updates disconnected/);
  assert.match(html, />Reconnect</);
});

test("thread panel reports a connected stream without a reconnect action", () => {
  const html = renderStatus("connected");
  assert.match(html, /Live updates connected/);
  assert.doesNotMatch(html, />Reconnect</);
});

const messages = [
  {
    id: "message-1",
    sender_id: "user-1",
    recipient_id: "user-2",
    content: "First message",
    created_at: "2026-09-20T10:00:00.000Z",
  },
  {
    id: "message-2",
    sender_id: "user-2",
    recipient_id: "user-1",
    content: "Reply after a pause",
    created_at: "2026-09-20T10:30:00.000Z",
  },
];

test("renders a 30-minute separator while keeping per-message timestamps", () => {
  const html = renderToStaticMarkup(
    <ThreadPanel
      currentUserId="user-1"
      selectedContact={{
        id: "user-2",
        full_name: "Chat Contact",
        email: null,
        inspector_code: null,
        location: null,
        role: "user",
        last_message_preview: "Reply after a pause",
        last_message_at: messages[1].created_at,
      }}
      messages={messages}
      isDesktop
      isLoadingMessages={false}
      isSendingMessage={false}
      draftMessage=""
      lastMessageRef={createRef<HTMLDivElement>()}
      connectionStatus="connected"
      onBack={() => {}}
      onDraftChange={() => {}}
      onSendMessage={() => {}}
      onReconnect={() => {}}
    />,
  );

  assert.equal((html.match(/role="separator"/g) ?? []).length, 2);
  assert.match(html, new RegExp(`aria-label="${formatTimestamp(messages[0].created_at)}"`));
  assert.match(html, new RegExp(`aria-label="${formatTimestamp(messages[1].created_at)}"`));
  assert.match(html, /First message/);
  assert.match(html, /Reply after a pause/);
});
