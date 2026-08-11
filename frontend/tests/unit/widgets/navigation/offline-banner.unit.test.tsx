import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { OfflineBanner } from "../../../../src/widgets/navigation";

test("offline banner preserves its cached-data message while offline", () => {
  const markup = renderToStaticMarkup(<OfflineBanner initialIsOnline={false} />);

  assert.match(markup, /offline/);
  assert.match(markup, /showing cached data/);
});
