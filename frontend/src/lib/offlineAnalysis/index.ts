/**
 * Offline analysis orchestrator.
 *
 * Runs freshness analysis inside the browser using the ONNX classifier.
 * The model is the primary and only classification source.
 *
 * Returns an AnalysisResult aligned with backend fields used by the app.
 */

import type { AnalysisResult, FreshnessClassification } from "@/types/inspection";
import { classifyWithMobileNetV3, loadMobileNetV3, isModelReady, getLoadedModelPath } from "./mobileNetV3";
import {
  classifyRecommendation,
  computeFreshnessScore,
  createCroppedResizedImageFile,
  DEFAULT_MEATLENS_INPUT_SIZE,
  type SquareGuideBox,
} from "./meatLensPipeline";

export { prewarmModel } from "./mobileNetV3";
export { calibrateFromImage } from "./calibration";
export { loadCalibration, saveCalibration, calibrationTTLMs } from "./calibrationStore";

const MODEL_LOAD_WAIT_ONLINE_MS = 45_000;
const MODEL_LOAD_WAIT_OFFLINE_MS = 2_500;
const MODEL_LOAD_ATTEMPT_INTERVAL_MS = 1_200;
const ANALYSIS_INPUT_SIZE = DEFAULT_MEATLENS_INPUT_SIZE;

interface AnalyzeOfflineOptions {
  guideBox?: SquareGuideBox | null;
}

async function waitForModelLoad(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const loaded = await loadMobileNetV3({ forceRetry: true });
    if (loaded || isModelReady()) {
      return true;
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }

    await new Promise<void>((resolve) =>
      window.setTimeout(resolve, Math.min(MODEL_LOAD_ATTEMPT_INTERVAL_MS, remainingMs))
    );
  }

  return isModelReady();
}

/**
 * Run full offline analysis on the captured image file.
 *
 * The model is given a short load window; if it is still unavailable,
 * analysis returns an error so callers can retry after warmup.
 */
export async function analyzeOffline(
  imageFile: File,
  meatType: string,
  options: AnalyzeOfflineOptions = {}
): Promise<AnalysisResult> {
  // Use the same deterministic path for camera and upload:
  // - camera: guide-box square crop
  // - upload: centered square fallback crop
  // Both are then resized to 224x224 before feature extraction / inference.
  const processedImageFile = await createCroppedResizedImageFile(imageFile, {
    guideBox: options.guideBox ?? null,
    size: ANALYSIS_INPUT_SIZE,
    mimeType: "image/png",
  });

  // Try to use the ONNX model if it has already been loaded.
  let modelResult = null;
  if (isModelReady()) {
    modelResult = await classifyWithMobileNetV3(processedImageFile, { guideBox: null });
  } else {
    // Give the model a short chance to load so first-use scans can benefit.
    const loadWaitMs = navigator.onLine ? MODEL_LOAD_WAIT_ONLINE_MS : MODEL_LOAD_WAIT_OFFLINE_MS;
    const loadedInTime = await waitForModelLoad(loadWaitMs);
    if (loadedInTime && isModelReady()) {
      modelResult = await classifyWithMobileNetV3(processedImageFile, { guideBox: null });
    }
  }

  if (navigator.onLine && !modelResult) {
    throw new Error("Model inference is required for online analysis.");
  }
  if (!modelResult) {
    throw new Error("Model inference is unavailable. Please retry after model warmup completes.");
  }

  const finalClassification: FreshnessClassification = modelResult.classification;
  const finalConfidenceScore = modelResult.confidence;
  const finalConfidenceProbability = Math.max(0, Math.min(1, finalConfidenceScore / 100));
  const finalFreshnessScore = computeFreshnessScore(finalClassification, finalConfidenceProbability);
  const finalRecommendation = classifyRecommendation(finalFreshnessScore);
  const explanation = `${meatType} sample classified as ${finalClassification} by the MobileNetV3 model with ${finalConfidenceScore}% confidence. Freshness score is model-derived and not a direct biochemical measurement.`;

  return {
    classification: finalClassification,
    confidence_score: finalConfidenceScore,
    model_confidence_score: modelResult.confidence,
    rule_confidence_score: null,
    freshness_score: Math.round(finalFreshnessScore),
    recommendation: finalRecommendation,
    probabilities: modelResult.probabilities,
    label_order: modelResult.labelOrder,
    flagged_deviations: [],
    explanation,
    analysis_source: "mobilenetv3",
    model_path: getLoadedModelPath(),
  };
}
