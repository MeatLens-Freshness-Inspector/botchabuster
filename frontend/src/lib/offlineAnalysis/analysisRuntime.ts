import type { FreshnessClassification } from "@/types/inspection";
import {
  buildEnsembleAnalysisResult,
  type EnsembleFusionResult,
  type EnsembleSourcePrediction,
} from "./ensemble";
import {
  classifyWithMobileNetV3,
  getLoadedModelPath as getLoadedMobileNetModelPath,
  isModelReady as isMobileNetReady,
  loadMobileNetV3Model,
  type ModelPredictionResult,
} from "./mobileNetV3Onnx";
import {
  classifyWithResNet50,
  getLoadedResNet50ModelPath,
  isResNet50Ready,
  loadResNet50Model,
} from "./resNet50Onnx";
import type { FreshnessRecommendation, SquareGuideBox } from "./meatLensPipeline";

export type AnalysisMode = "ensemble" | "mobilenetv3";

export interface ActiveAnalysisPrediction {
  classification: FreshnessClassification;
  confidenceProbability: number;
  confidencePercent: number;
  probabilities: Partial<Record<FreshnessClassification, number>>;
  labelOrder: FreshnessClassification[];
  freshnessScore: number;
  recommendation: FreshnessRecommendation;
  analysisSource: "mobilenetv3" | "ensemble";
  modelPath: string | null;
}

interface AnalyzeOptions {
  guideBox?: SquareGuideBox | null;
}

let activeAnalysisMode: AnalysisMode = "ensemble";

function toEnsembleSourcePrediction(
  result: ModelPredictionResult,
  modelPath: string | null
): EnsembleSourcePrediction {
  return {
    classification: result.classification,
    confidence: result.confidence,
    confidenceProbability: result.confidenceProbability,
    probabilities: result.probabilities,
    freshnessScore: result.freshnessScore,
    recommendation: result.recommendation,
    labelOrder: result.labelOrder,
    metadata: result.metadata,
    modelPath,
  };
}

function toActiveAnalysisPrediction(
  result: ModelPredictionResult,
  analysisSource: "mobilenetv3"
): ActiveAnalysisPrediction {
  return {
    classification: result.classification,
    confidenceProbability: result.confidenceProbability,
    confidencePercent: result.confidence,
    probabilities: result.probabilities,
    labelOrder: result.labelOrder,
    freshnessScore: result.freshnessScore,
    recommendation: result.recommendation,
    analysisSource,
    modelPath: result.modelPath ?? getLoadedMobileNetModelPath(),
  };
}

function toActiveAnalysisPredictionFromEnsemble(
  result: EnsembleFusionResult
): ActiveAnalysisPrediction {
  return {
    classification: result.classification,
    confidenceProbability: result.confidenceProbability,
    confidencePercent: result.confidencePercent,
    probabilities: result.probabilities,
    labelOrder: result.labelOrder,
    freshnessScore: result.freshnessScore,
    recommendation: result.recommendation,
    analysisSource: result.analysisSource,
    modelPath: result.modelPath,
  };
}

export function setActiveAnalysisMode(mode: AnalysisMode): void {
  activeAnalysisMode = mode;
}

export function getActiveAnalysisMode(): AnalysisMode {
  return activeAnalysisMode;
}

export function isAnalysisReady(): boolean {
  if (activeAnalysisMode === "ensemble") {
    return isMobileNetReady() || isResNet50Ready();
  }

  return isMobileNetReady();
}

export async function loadActiveAnalysisModel(options: { forceRetry?: boolean } = {}): Promise<boolean> {
  if (activeAnalysisMode === "ensemble") {
    await Promise.all([
      loadMobileNetV3Model(options),
      loadResNet50Model(options),
    ]);
    return isAnalysisReady();
  }

  await loadMobileNetV3Model(options);
  return isAnalysisReady();
}

export function prewarmAnalysisModel(): void {
  if (navigator.onLine) {
    void loadActiveAnalysisModel();
  }
}

export async function runActiveAnalysis(
  imageFile: File,
  options: AnalyzeOptions = {}
): Promise<ActiveAnalysisPrediction | null> {
  if (activeAnalysisMode === "ensemble") {
    const [mobileNetResult, resNetResult] = await Promise.all([
      classifyWithMobileNetV3(imageFile, options),
      classifyWithResNet50(imageFile, options),
    ]);

    const ensembleResult = buildEnsembleAnalysisResult(
      mobileNetResult
        ? toEnsembleSourcePrediction(
            mobileNetResult,
            mobileNetResult.modelPath ?? getLoadedMobileNetModelPath()
          )
        : null,
      resNetResult
        ? toEnsembleSourcePrediction(
            resNetResult,
            resNetResult.modelPath ?? getLoadedResNet50ModelPath()
          )
        : null,
    );

    return ensembleResult ? toActiveAnalysisPredictionFromEnsemble(ensembleResult) : null;
  }

  const mobileNetResult = await classifyWithMobileNetV3(imageFile, options);
  if (!mobileNetResult) {
    return null;
  }

  return toActiveAnalysisPrediction(mobileNetResult, "mobilenetv3");
}
