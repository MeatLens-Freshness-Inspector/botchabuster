import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landingPageSource = readFileSync(
  new URL("../../../../src/pages/public/landing-page.tsx", import.meta.url),
  "utf8",
);
const globalStylesSource = readFileSync(
  new URL("../../../../src/app/styles/globals.css", import.meta.url),
  "utf8",
);

test("landing page publishes its white Swiss visual system", () => {
  assert.match(landingPageSource, /landing-page/);
  assert.match(globalStylesSource, /--landing-surface: #ffffff/);
  assert.match(globalStylesSource, /--landing-accent: #ff4f00/);
  assert.match(globalStylesSource, /Helvetica Neue/);
});
