import { expect, test } from "@playwright/test";
import {
  classifyRecommendation,
  computeFreshnessScore,
  normalizeModelProbabilities,
  parsePrediction,
  preprocessRgbPixel,
  resolveCenteredObjectCoverGuideBox,
  resolveOutputLabels,
  resolvePreprocessMode,
  resolveSquareCropRegion,
} from "../../src/lib/offlineAnalysis/meatLensPipeline";

test.describe("MeatLens inference pipeline helpers", () => {
  test("uses centered square crop when no guide-box is provided", () => {
    const crop = resolveSquareCropRegion(1000, 600);

    expect(crop).toEqual({ left: 200, top: 0, side: 600 });
  });

  test("uses guide-box crop and clamps it to image bounds", () => {
    const crop = resolveSquareCropRegion(1000, 800, {
      x: 900,
      y: 700,
      size: 300,
    });

    expect(crop).toEqual({ left: 700, top: 500, side: 300 });
  });

  test("projects centered overlay guide-box from object-cover viewport to source", () => {
    const guideBox = resolveCenteredObjectCoverGuideBox({
      sourceWidth: 1280,
      sourceHeight: 960,
      viewportWidth: 400,
      viewportHeight: 300,
      overlayWidthRatio: 0.72,
    });
    const crop = resolveSquareCropRegion(1280, 960, guideBox);

    expect(guideBox.normalized).toBeTruthy();
    expect(crop).toEqual({ left: 179, top: 19, side: 922 });
  });

  test("accounts for object-cover side-cropping on wider camera feeds", () => {
    const guideBox = resolveCenteredObjectCoverGuideBox({
      sourceWidth: 1280,
      sourceHeight: 720,
      viewportWidth: 400,
      viewportHeight: 300,
      overlayWidthRatio: 0.72,
    });
    const crop = resolveSquareCropRegion(1280, 720, guideBox);

    expect(crop).toEqual({ left: 294, top: 14, side: 691 });
  });

  test("resolves preprocess mode from metadata hints", () => {
    expect(resolvePreprocessMode({ preprocess_function_name: "mobilenet_v3.preprocess_input" })).toBe("mobilenet_v3");
    expect(resolvePreprocessMode({ backbone: "EfficientNetB0" })).toBe("efficientnet");
    expect(resolvePreprocessMode({ backbone: "ResNet50" })).toBe("resnet50");
    expect(resolvePreprocessMode({ preprocess_function_name: "identity" })).toBe("identity");
  });

  test("applies MobileNetV3 preprocessing in [-1, 1] range", () => {
    const [r, g, b] = preprocessRgbPixel({ r: 0, g: 127.5, b: 255 }, "mobilenet_v3");

    expect(r).toBeCloseTo(-1, 5);
    expect(g).toBeCloseTo(0, 5);
    expect(b).toBeCloseTo(1, 5);
  });

  test("keeps EfficientNet pixels in 0-255 before model graph internal scaling", () => {
    const [r, g, b] = preprocessRgbPixel({ r: 17, g: 111, b: 243 }, "efficientnet");

    expect(r).toBe(17);
    expect(g).toBe(111);
    expect(b).toBe(243);
  });

  test("prefers metadata label order, otherwise falls back by class count", () => {
    expect(resolveOutputLabels(3, ["fresh", "not fresh", "spoiled"]))
      .toEqual(["fresh", "not fresh", "spoiled"]);

    expect(resolveOutputLabels(3)).toEqual(["fresh", "not fresh", "spoiled"]);
    expect(resolveOutputLabels(4)).toEqual(["fresh", "acceptable", "warning", "spoiled"]);
  });

  test("merges low-confidence adjacent pairs only (fresh/not fresh, not fresh/spoiled)", () => {
    const freshMerge = parsePrediction([0.48, 0.43, 0.09], ["fresh", "not fresh", "spoiled"]);
    expect(freshMerge.predictedClass).toBe("fresh");
    expect(freshMerge.confidence).toBeCloseTo(0.91, 10);
    expect(freshMerge.confidencePercent).toBe(91);

    const notFreshSpoiledMerge = parsePrediction([0.06, 0.49, 0.45], ["fresh", "not fresh", "spoiled"]);
    expect(notFreshSpoiledMerge.predictedClass).toBe("not fresh");
    expect(notFreshSpoiledMerge.confidence).toBeCloseTo(0.94, 10);
    expect(notFreshSpoiledMerge.confidencePercent).toBe(94);
  });

  test("does not merge low-confidence non-adjacent pair (fresh/spoiled)", () => {
    const prediction = parsePrediction([0.44, 0.08, 0.48], ["fresh", "not fresh", "spoiled"]);

    expect(prediction.predictedClass).toBe("warning");
    expect(prediction.confidence).toBeCloseTo(0.48, 10);
    expect(prediction.confidencePercent).toBe(48);
  });

  test("keeps top-1 class when model confidence is at least 90 percent", () => {
    const prediction = parsePrediction([0.92, 0.05, 0.03], ["fresh", "not fresh", "spoiled"]);

    expect(prediction.predictedClass).toBe("fresh");
    expect(prediction.confidence).toBeCloseTo(0.92, 10);
    expect(prediction.confidencePercent).toBe(92);
  });

  test("computes freshness score and recommendation from class confidence", () => {
    expect(computeFreshnessScore("fresh", 0.8)).toBeCloseTo(94, 5);
    expect(computeFreshnessScore("not fresh", 0.5)).toBeCloseTo(50, 5);
    expect(computeFreshnessScore("spoiled", 1)).toBeCloseTo(0, 5);

    expect(classifyRecommendation(75)).toBe("Good for Consumption");
    expect(classifyRecommendation(69)).toBe("Consume Immediately");
    expect(classifyRecommendation(39)).toBe("Not Suitable");
  });
});
