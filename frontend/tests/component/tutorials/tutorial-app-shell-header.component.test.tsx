import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { TutorialAppShell } from "../../../src/features/tutorials";

test("tutorial shell uses the active app tab for its header identity", () => {
  const markup = renderToStaticMarkup(
    <TutorialAppShell activeTab="profile" title="My Profile" subtitle="Account center">
      <p>Scene content</p>
    </TutorialAppShell>,
  );

  assert.match(markup, /data-tutorial-tab="profile"[^>]*data-active="true"/);
  assert.match(markup, /lucide-user-round/);
  assert.match(markup, />My Profile</);
});
