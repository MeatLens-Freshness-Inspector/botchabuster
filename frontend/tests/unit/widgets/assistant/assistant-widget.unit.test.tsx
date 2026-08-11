import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { AssistantWidget, getChatRequestHeaders } from "../../../../src/widgets/assistant";

test("assistant widget remains unavailable without online authentication", () => {
  const markup = renderToStaticMarkup(<AssistantWidget isOnlineAuthenticated={false} />);

  assert.equal(markup, "");
  assert.equal(getChatRequestHeaders()["Content-Type"], "application/json");
});
