import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { MessagesMockScene, tutorialDefinitions, tutorialFixtures } from "../../../src/features/tutorials";

test("messages tutorial mirrors the contact directory and connected thread", () => {
  const directory = renderToStaticMarkup(
    <MessagesMockScene step={tutorialDefinitions.messages[0]} onAdvance={() => {}} />,
  );
  const thread = renderToStaticMarkup(
    <MessagesMockScene step={tutorialDefinitions.messages[1]} onAdvance={() => {}} />,
  );

  assert.match(directory, /data-tutorial-tab="messages"[^>]*data-active="true"/);
  assert.match(directory, new RegExp(tutorialFixtures.messages.contactLabel));
  assert.match(directory, /Contact Directory/);
  assert.match(thread, /Conversation Thread|No messages yet/);
  assert.match(thread, /Live updates connected/);
});
