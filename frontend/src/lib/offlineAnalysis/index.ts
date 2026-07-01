/**
 * Offline analysis orchestrator.
 *
 * Runs freshness analysis inside the browser using the ONNX classifier.
 * The model is the primary and only classification source.
 *
 * Returns an AnalysisResult aligned with backend fields used by the app.
 */

import type { AnalysisResult, FreshnessClassification } from "@/types/inspection";
import {
  classifyWithMobileNetV3,
  loadMobileNetV3,
  isModelReady,
  getLoadedModelPath,
  getActiveModelPreprocessContract,
} from "./mobileNetV3";
import {
  classifyRecommendation,
  computeFreshnessScore,
  createModelInputImageFile,
  DEFAULT_MEATLENS_INPUT_SIZE,
  type SquareGuideBox,
} from "./meatLensPipeline";
import { validateImageQuality, type ImageQualityResult } from "@/lib/imageQuality";

export { prewarmModel } from "./mobileNetV3";

const MODEL_LOAD_WAIT_ONLINE_MS = 45_000;
const MODEL_LOAD_WAIT_OFFLINE_MS = 2_500;
const MODEL_LOAD_ATTEMPT_INTERVAL_MS = 1_200;
const ANALYSIS_INPUT_SIZE = DEFAULT_MEATLENS_INPUT_SIZE;
const LOW_CONFIDENCE_WARNING_THRESHOLD = 90;
const RETAKE_RECOMMEND_THRESHOLD = 80;

interface AnalyzeOfflineOptions {
  guideBox?: SquareGuideBox | null;
}

interface OfflineAnalysisTestWindow extends Window {
  __mockOfflineAnalysisResult?: AnalysisResult;
}

export function getMockOfflineAnalysisResult(): AnalysisResult | null {
  return (window as OfflineAnalysisTestWindow).__mockOfflineAnalysisResult ?? null;
}

export function hasMockOfflineAnalysisResult(): boolean {
  return getMockOfflineAnalysisResult() !== null;
}

function formatClassificationLabel(classification: FreshnessClassification): string {
  if (classification === "not fresh") {
    return "Not Fresh";
  }

  return classification.charAt(0).toUpperCase() + classification.slice(1);
}

function describeConfidenceBand(confidenceScore: number): string {
  if (confidenceScore >= LOW_CONFIDENCE_WARNING_THRESHOLD) {
    return "high confidence";
  }

  if (confidenceScore >= RETAKE_RECOMMEND_THRESHOLD) {
    return "moderate confidence";
  }

  if (confidenceScore >= 70) {
    return "cautious confidence";
  }

  return "low confidence";
}

function describeClassification(classification: FreshnessClassification): string {
  if (classification === "fresh") {
    return "Visual signals are aligned with the fresh reference profile for this model.";
  }

  if (classification === "acceptable") {
    return "The sample remains in an acceptable range, but early decline patterns are present.";
  }

  if (classification === "warning") {
    return "The model detected uncertain or declining freshness indicators, so closer inspector review is advised.";
  }

  if (classification === "not fresh") {
    return "The pattern suggests notable freshness loss and should be handled with caution.";
  }

  return "The output is consistent with advanced spoilage indicators and should be treated as high risk.";
}

type ConfidenceTier = "strong" | "review" | "caution" | "retake";

interface ProbabilityEntry {
  label: FreshnessClassification;
  value: number;
}

function resolveConfidenceTier(confidenceScore: number): ConfidenceTier {
  if (confidenceScore >= LOW_CONFIDENCE_WARNING_THRESHOLD) {
    return "strong";
  }

  if (confidenceScore >= RETAKE_RECOMMEND_THRESHOLD) {
    return "review";
  }

  if (confidenceScore >= 70) {
    return "caution";
  }

  return "retake";
}

function resolveProbabilityEntries(
  probabilities: Partial<Record<FreshnessClassification, number>> | undefined,
  labelOrder: FreshnessClassification[] | undefined
): ProbabilityEntry[] {
  if (!probabilities) {
    return [];
  }

  const labels = labelOrder && labelOrder.length > 0
    ? labelOrder
    : (Object.keys(probabilities) as FreshnessClassification[]);

  return labels
    .map((label) => ({ label, value: probabilities[label] }))
    .filter(
      (entry): entry is ProbabilityEntry =>
        typeof entry.value === "number" && Number.isFinite(entry.value) && entry.value >= 0
    )
    .sort((left, right) => right.value - left.value);
}

function buildProbabilitySummary(
  probabilities: Partial<Record<FreshnessClassification, number>> | undefined,
  labelOrder: FreshnessClassification[] | undefined
): string | null {
  const entries = resolveProbabilityEntries(probabilities, labelOrder);

  if (entries.length === 0) {
    return null;
  }

  return entries
    .map((entry) => `${formatClassificationLabel(entry.label)} ${Math.round(entry.value * 100)}%`)
    .join(", ");
}

function buildProbabilityDiagnostics(
  probabilities: Partial<Record<FreshnessClassification, number>> | undefined,
  labelOrder: FreshnessClassification[] | undefined
): string | null {
  const entries = resolveProbabilityEntries(probabilities, labelOrder);
  if (entries.length < 2) {
    return null;
  }

  const top1 = entries[0];
  const top2 = entries[1];
  const marginPercent = Math.round((top1.value - top2.value) * 100);

  return `Margin between top-1 (${formatClassificationLabel(top1.label)}) and top-2 (${formatClassificationLabel(top2.label)}) is ${marginPercent} percentage points.`;
}

function buildBranchNarrative(classification: FreshnessClassification, confidenceTier: ConfidenceTier): string {
  const branchLabel = `${formatClassificationLabel(classification)}-${confidenceTier}`.toUpperCase();

  if (classification === "fresh") {
    if (confidenceTier === "strong") {
      return `Output branch ${branchLabel}: Fresh signal is dominant with stable separation from competing classes.`;
    }
    return `Output branch ${branchLabel}: Fresh indicators are present but still require manual confirmation before release decisions.`;
  }

  if (classification === "acceptable") {
    if (confidenceTier === "strong") {
      return `Output branch ${branchLabel}: Product is within acceptable range but drift markers are measurable.`;
    }
    return `Output branch ${branchLabel}: Acceptable branch with uncertainty; handle as near-threshold quality.`;
  }

  if (classification === "warning") {
    if (confidenceTier === "strong") {
      return `Output branch ${branchLabel}: Warning class has clear dominance, indicating quality instability.`;
    }
    if (confidenceTier === "review") {
      return `Output branch ${branchLabel}: Warning-level result driven by mid confidence; prioritize inspector review before storage/sell decisions.`;
    }
    if (confidenceTier === "caution") {
      return `Output branch ${branchLabel}: Warning plus low separation. Capture conditions or sample variation may be affecting certainty.`;
    }
    return `Output branch ${branchLabel}: Warning with very low certainty. Retake workflow should be prioritized.`;
  }

  if (classification === "not fresh") {
    if (confidenceTier === "strong") {
      return `Output branch ${branchLabel}: Not-fresh profile is strongly expressed and aligns with quality decline.`;
    }
    return `Output branch ${branchLabel}: Not-fresh branch detected with uncertainty; treat conservatively.`;
  }

  if (confidenceTier === "strong") {
    return `Output branch ${branchLabel}: Spoilage markers dominate model output and indicate high-risk quality state.`;
  }
  return `Output branch ${branchLabel}: Spoilage branch detected, but confidence is not fully stable.`;
}

function buildDecisionAdvice(
  classification: FreshnessClassification,
  confidenceTier: ConfidenceTier,
  recommendation: "Good for Consumption" | "Consume Immediately" | "Not Suitable"
): string {
  if (confidenceTier === "retake") {
    return "Decision guidance: retake first, then only proceed to logging/saving after inspector recheck.";
  }

  if (confidenceTier === "caution") {
    return `Decision guidance: keep current recommendation (${recommendation}) but require supervisor-level validation due to low confidence.`;
  }

  if (confidenceTier === "review") {
    return `Decision guidance: recommendation is ${recommendation}; proceed only with explicit inspector confirmation and notes.`;
  }

  if (classification === "warning" || classification === "not fresh" || classification === "spoiled") {
    return `Decision guidance: recommendation is ${recommendation}; prioritize immediate handling and stricter quality controls.`;
  }

  return `Decision guidance: recommendation is ${recommendation}; acceptable for normal flow with routine documentation.`;
}

function buildAnalysisExplanation({
  meatType,
  classification,
  confidenceScore,
  freshnessScore,
  recommendation,
  probabilities,
  labelOrder,
}: {
  meatType: string;
  classification: FreshnessClassification;
  confidenceScore: number;
  freshnessScore: number;
  recommendation: "Good for Consumption" | "Consume Immediately" | "Not Suitable";
  probabilities?: Partial<Record<FreshnessClassification, number>>;
  labelOrder?: FreshnessClassification[];
}): string {
  const probabilitySummary = buildProbabilitySummary(probabilities, labelOrder);
  const probabilityDiagnostics = buildProbabilityDiagnostics(probabilities, labelOrder);
  const confidenceBand = describeConfidenceBand(confidenceScore);
  const confidenceTier = resolveConfidenceTier(confidenceScore);
  const formattedClass = formatClassificationLabel(classification);

  const sentences = [
    `The ${meatType} sample is classified as ${formattedClass} by MobileNetV3 ONNX with ${confidenceScore}% confidence (${confidenceBand}).`,
    probabilitySummary ? `Class probabilities: ${probabilitySummary}.` : null,
    probabilityDiagnostics,
    buildBranchNarrative(classification, confidenceTier),
    describeClassification(classification),
    `Computed freshness score is ${Math.round(freshnessScore)}/100, mapped to recommendation: ${recommendation}.`,
    confidenceScore < RETAKE_RECOMMEND_THRESHOLD
      ? "Confidence is below 80%, so retaking the photo with steadier framing and clearer lighting is strongly recommended before final action."
      : confidenceScore < LOW_CONFIDENCE_WARNING_THRESHOLD
      ? "Confidence is below 90%, so this output should be treated as warning-level and validated by inspector judgment."
      : "Confidence is at or above 90%, indicating a stable model decision under current capture conditions.",
    buildDecisionAdvice(classification, confidenceTier, recommendation),
    "This score is model-derived from image patterns and should be interpreted as decision support, not a direct biochemical measurement.",
  ];

  return sentences.filter(Boolean).join(" ");
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
 * Validates image quality from a File using an off-screen canvas.
 * Returns the structured ImageQualityResult so the caller can gate inference.
 *
 * Operates on the raw capture file — NOT the preprocessed 224×224 model input.
 */
async function assessFileImageQuality(file: File): Promise<ImageQualityResult | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const imageData = ctx.getImageData(0, 0, width, height);
    return validateImageQuality(imageData, width, height);
  } catch {
    // If quality assessment itself fails (e.g., unsupported format), do not block inference.
    return null;
  }
}

/**
 * Run full offline analysis on the captured image file.
 *
 * Before invoking the ONNX model, the raw capture is validated for minimum
 * quality (resolution, brightness, sharpness). If validation fails, an error
 * is thrown with the issue descriptions so the UI can prompt a retake.
 *
 * The model is given a short load window; if it is still unavailable,
 * analysis returns an error so callers can retry after warmup.
 */
export async function analyzeOffline(
  imageFile: File,
  meatType: string,
  options: AnalyzeOfflineOptions = {}
): Promise<AnalysisResult> {
  // --- Pre-inference quality gate -------------------------------------------
  // Validate image quality on the original capture before any preprocessing.
  // Warnings are logged but do not block. Hard failures abort early so we
  // never waste model load time or inference compute on unusable frames.
  const qualityResult = await assessFileImageQuality(imageFile);
  if (qualityResult !== null) {
    if (!qualityResult.canProceed) {
      const failMessages = qualityResult.issues
        .filter((issue) => issue.severity === "fail")
        .map((issue) => issue.message)
        .join(" ");
      throw new Error(
        `Image quality check failed. Retake the photo and ensure the sample is well-lit and in focus. Details: ${failMessages}`
      );
    }

    if (qualityResult.issues.length > 0) {
      console.warn(
        "[Model][QualityGate] Image quality warnings (inference will proceed):",
        qualityResult.issues.map((i) => `[${i.code}] ${i.message}`).join("; ")
      );
    }
  }
  // --------------------------------------------------------------------------

  const mockResult = getMockOfflineAnalysisResult();
  if (mockResult) {
    return mockResult;
  }

  const preprocessContract = getActiveModelPreprocessContract();
  const requiresSegmentedCenterRoi = preprocessContract === "segmented_center_roi";

  // Model2 contract:
  // - center square crop
  // - resize to 224x224
  // - HSV/LAB-based ROI segmentation
  // - gray background replacement
  // If segmentation fails, fallback to center-cropped ROI image.
  const preparedInput = await createModelInputImageFile(imageFile, {
    guideBox: requiresSegmentedCenterRoi ? null : (options.guideBox ?? null),
    forceCenterCrop: requiresSegmentedCenterRoi,
    applySegmentation: requiresSegmentedCenterRoi,
    size: ANALYSIS_INPUT_SIZE,
    mimeType: "image/png",
  });
  const processedImageFile = preparedInput.file;

  if (requiresSegmentedCenterRoi && !preparedInput.segmentationApplied) {
    console.info("[Model][ONNX] Segmentation fallback applied: using center-cropped 224x224 ROI.");
  }

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
  const explanation = buildAnalysisExplanation({
    meatType,
    classification: finalClassification,
    confidenceScore: finalConfidenceScore,
    freshnessScore: finalFreshnessScore,
    recommendation: finalRecommendation,
    probabilities: modelResult.probabilities,
    labelOrder: modelResult.labelOrder,
  });

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
