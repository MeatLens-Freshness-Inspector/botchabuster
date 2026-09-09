import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { TutorialAppShell } from "../../../src/features/tutorials";

test("tutorial phone navigation mirrors the inspector app tab order", () => {
  const markup = renderToStaticMarkup(
    <TutorialAppShell activeTab="messages" title="Messages" subtitle="Support">
      <p>Scene content</p>
    </TutorialAppShell>,
  );

  const tabs = [...markup.matchAll(/data-tutorial-tab="([^"]+)"/g)].map(
    ([, tab]) => tab,
  );

  assert.deepEqual(tabs, ["inspect", "history", "messages", "profile"]);
  assert.match(markup, /data-tutorial-tab="messages"[^>]*data-active="true"/);
  assert.match(markup, /data-tutorial-tab="messages"[^>]*aria-current="page"/);
  assert.match(markup, /aria-label="Tutorial app navigation"/);
});
