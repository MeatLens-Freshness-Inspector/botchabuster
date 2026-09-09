import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";

import { MockPhoneFrame } from "../../../src/features/tutorials";

test("phone frame separates the app scroll region from its bottom shell chrome", () => {
  const markup = renderToStaticMarkup(
    <MockPhoneFrame>
      <div data-tutorial-app-content data-testid="phone-content">Long tutorial scene</div>
    </MockPhoneFrame>,
  );

  assert.match(markup, /data-tutorial-phone-frame/);
  assert.match(markup, /w-\[min\(300px,calc\(100vw-2rem\)\)\]/);
  assert.match(markup, /data-tutorial-phone-screen[^>]*class="[^"]*overflow-hidden/);
  assert.match(markup, /data-tutorial-phone-screen[^>]*class="[^"]*min-h-0/);
  assert.match(markup, /data-tutorial-phone-screen[^>]*class="[^"]*flex-col/);
  assert.match(markup, /data-testid="phone-content"/);
  assert.match(markup, /data-tutorial-phone-home-indicator/);
  assert.match(markup, /data-tutorial-app-content/);
});
