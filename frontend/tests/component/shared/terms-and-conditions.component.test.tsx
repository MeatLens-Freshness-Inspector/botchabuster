import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TermsAndConditionsContent } from "../../../src/widgets/legal/terms-content";

Object.assign(globalThis, { React });

test("renders the terms content title and reminder copy", () => {
  const markup = renderToStaticMarkup(
    <TermsAndConditionsContent />,
  );

  assert.match(markup, /MeatLens - Terms and Conditions \(Field Use Version\)/);
  assert.match(markup, /Supporting inspectors, not replacing them/);
});
