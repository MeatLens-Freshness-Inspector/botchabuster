import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";

import { TutorialAppShell } from "../../../src/features/tutorials";

test("tutorial app shell mirrors the inspector navigation and keeps the active tab visible", () => {
  const markup = renderToStaticMarkup(
    <TutorialAppShell
      activeTab="messages"
      title="Messages"
      subtitle="Reach admins for inspection support"
    >
      <div data-testid="tutorial-content">Conversation Thread</div>
    </TutorialAppShell>,
  );

  assert.match(markup, /data-tutorial-app-shell/);
  assert.match(markup, /data-tutorial-app-content/);
  assert.match(markup, /data-testid="tutorial-content"/);
  assert.match(markup, /data-tutorial-tab="inspect"/);
  assert.match(markup, /data-tutorial-tab="history"/);
  assert.match(markup, /data-tutorial-tab="messages"[^>]*data-active="true"/);
  assert.match(markup, /data-tutorial-tab="profile"/);
});
