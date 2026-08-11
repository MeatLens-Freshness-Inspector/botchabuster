import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { PublicLayout } from "../../../src/app/layouts/public-layout";

test("public app layout preserves the public page as its only rendered slot", () => {
  const markup = renderToStaticMarkup(
    <PublicLayout>
      <main data-testid="public-page">public page</main>
    </PublicLayout>
  );

  assert.match(markup, /data-testid="public-page"/);
  assert.equal(markup.indexOf("public page"), markup.lastIndexOf("public page"));
});
