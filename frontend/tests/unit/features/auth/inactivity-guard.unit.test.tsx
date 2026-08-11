import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { MemoryRouter } from "react-router-dom";
import { InactivityGuard } from "../../../../src/features/auth";

test("inactivity guard stays inert for an anonymous session", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <InactivityGuard user={null} lock={async () => undefined} loginPath="/login" />
    </MemoryRouter>
  );

  assert.equal(markup, "");
});
