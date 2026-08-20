import assert from "node:assert/strict";
import { createRef } from "react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { ThreadPanel } from "../../../src/widgets/messages";

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
