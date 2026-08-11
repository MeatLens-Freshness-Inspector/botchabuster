import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AppLayout } from "../../../src/app/layouts/app-layout";

test("signed-in app layout preserves screen, navigation, and assistant order", () => {
  const markup = renderToStaticMarkup(
    <AppLayout
      bottomNavigation={<span data-testid="navigation">navigation</span>}
      assistant={<span data-testid="assistant">assistant</span>}
    >
      <span data-testid="screen">screen</span>
    </AppLayout>,
  );

  assert.ok(markup.indexOf('data-testid="screen"') < markup.indexOf('data-testid="navigation"'));
  assert.ok(markup.indexOf('data-testid="navigation"') < markup.indexOf('data-testid="assistant"'));
});
