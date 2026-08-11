import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { MemoryRouter } from "react-router-dom";
import { BottomNav } from "../../../../src/widgets/navigation";

test("bottom navigation keeps the core links and conditionally exposes admin", () => {
  const regularMarkup = renderToStaticMarkup(
    <MemoryRouter>
      <BottomNav isAdmin={false} />
    </MemoryRouter>
  );
  const adminMarkup = renderToStaticMarkup(
    <MemoryRouter>
      <BottomNav isAdmin />
    </MemoryRouter>
  );

  for (const href of ["/inspect", "/history", "/messages", "/profile"]) {
    assert.match(regularMarkup, new RegExp(`href=\\"${href}\\"`));
  }
  assert.doesNotMatch(regularMarkup, /href="\/admin"/);
  assert.match(adminMarkup, /href="\/admin"/);
});
