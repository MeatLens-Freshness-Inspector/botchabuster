import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import LandingPage from "../../../../src/pages/public/landing-page";
import { TermsAndConditionsContent } from "../../../../src/widgets/legal/terms-content";
import { landingMockSamples } from "../../../../src/widgets/public-landing/lib/landing-data";

test("public landing ownership publishes its page and legal widget", () => {
  assert.equal(typeof LandingPage, "function");
  assert.equal(typeof TermsAndConditionsContent, "function");
});

test("public landing does not publish fabricated testimonials", () => {
  const landingPageSource = readFileSync(
    new URL("../../../../src/pages/public/landing-page.tsx", import.meta.url),
    "utf8",
  );
  const landingDataSource = readFileSync(
    new URL("../../../../src/widgets/public-landing/lib/landing-data.ts", import.meta.url),
    "utf8",
  );
  const publishedSource = `${landingPageSource}\n${landingDataSource}`;

  for (const fabricatedClaim of [
    "TestimonialsSection",
    "landingTestimonials",
    "Maria Santos",
    "Carlos Reyes",
    "Ana Dela Cruz",
  ]) {
    assert.equal(publishedSource.includes(fabricatedClaim), false, fabricatedClaim);
  }
});

test("public non-pork examples expose future scope without changing their type", () => {
  const nonPorkExamples = landingMockSamples.filter((sample) => sample.meatType !== "pork");
  assert.ok(nonPorkExamples.length > 0);
  assert.ok(nonPorkExamples.every((sample) => sample.scopeLabel === "Future validation / research use"));
  assert.ok(landingMockSamples.some((sample) => sample.meatType === "pork" && sample.scopeLabel === null));
});
