import { test, expect } from "@playwright/test";
import { evaluateBlur, evaluateForegroundPresence, getAdaptiveBlurThreshold } from "../../src/lib/captureQuality";

test.describe("captureQuality blur gating", () => {
  test("uses a lower threshold for low-contrast scenes", () => {
    const lowContrastThreshold = getAdaptiveBlurThreshold(120);
    const highContrastThreshold = getAdaptiveBlurThreshold(1400);

    expect(lowContrastThreshold).toBeLessThan(highContrastThreshold);
  });

  test("does not reject clear-but-smooth images", () => {
    const decision = evaluateBlur(58, 120);
    expect(decision.rejected).toBeFalsy();
  });

  test("rejects severely blurred images", () => {
    const decision = evaluateBlur(20, 120);
    expect(decision.rejected).toBeTruthy();
  });

  test("still rejects blurry high-detail images", () => {
    const decision = evaluateBlur(45, 1400);
    expect(decision.rejected).toBeTruthy();
  });

  test("rejects frames with no detectable meat foreground", () => {
    const decision = evaluateForegroundPresence(0);
    expect(decision.rejected).toBeTruthy();
  });

  test("accepts frames with sufficient foreground coverage", () => {
    const minimumAccepted = evaluateForegroundPresence(1).minRatio;
    const decision = evaluateForegroundPresence(minimumAccepted + 0.01);
    expect(decision.rejected).toBeFalsy();
  });
});
