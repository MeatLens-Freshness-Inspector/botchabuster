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

test("landing page publishes its white Swiss visual system", () => {
  assert.match(landingPageSource, /landing-page/);
  assert.match(landingStylesSource, /--landing-surface: #ffffff/);
  assert.match(landingStylesSource, /--landing-accent: #ff4f00/);
  assert.match(landingStylesSource, /Helvetica Neue/);
});
