import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landingPageSource = readFileSync(
  new URL("../../../../src/pages/public/landing-page.tsx", import.meta.url),
  "utf8",
);
const landingStylesSource = readFileSync(
  new URL("../../../../src/pages/public/landing-page.css", import.meta.url),
  "utf8",
);

test("landing page publishes its green and white visual system", () => {
  assert.match(landingPageSource, /landing-page/);
  assert.match(landingStylesSource, /--landing-surface: #ffffff/);
  assert.match(landingStylesSource, /--landing-accent: #218c5a/);
});

test("landing page uses the system typography tokens", () => {
  assert.match(landingStylesSource, /font-family: var\(--font-body\);/);
  assert.match(
    landingStylesSource,
    /:where\(h1, h2, h3, h4, h5, h6\) \{\s+font-family: var\(--font-display\);/,
  );
  assert.doesNotMatch(landingStylesSource, /Helvetica Neue/);
});
