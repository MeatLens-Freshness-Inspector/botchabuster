import type { FreshnessClassification } from "@/entities/inspection";
import {
  buildEnsembleAnalysisResult,
  type EnsembleFusionResult,
  type EnsembleSourcePrediction,
} from "@/features/offline-analysis/lib/ensemble";
import {
  classifyWithMobileNetV3,
  getActiveMobileNetModelVariant,
  getLoadedModelPath as getLoadedMobileNetModelPath,
  isModelReady as isMobileNetReady,
  loadMobileNetV3Model,
  setActiveMobileNetModelVariant,
  type ModelPredictionResult,
} from "@/features/offline-analysis/lib/mobilenet-runtime";
import {
  classifyWithResNet50,
  getLoadedResNet50ModelPath,
  isResNet50Ready,
  loadResNet50Model,
} from "@/features/offline-analysis/lib/resnet-runtime";
import {
  PRIMARY_ANALYSIS_MODEL,
  getAnalysisModelVersionKey,
  type AnalysisModelSelection,
} from "./model-catalog";
import { DEFAULT_DISABLE_ROI_SEGMENTATION } from "./preprocessing-defaults";
import type { FreshnessRecommendation, SquareGuideBox } from "./meat-lens-pipeline";

export type AnalysisMode = "ensemble" | "mobilenetv3" | "resnet50";

export interface ActiveAnalysisPrediction {
  classification: FreshnessClassification;
  confidenceProbability: number;
  confidencePercent: number;
  probabilities: Partial<Record<FreshnessClassification, number>>;
  labelOrder: FreshnessClassification[];
  freshnessScore: number;
  recommendation: FreshnessRecommendation;
  analysisSource: "mobilenetv3" | "resnet50" | "ensemble";
  modelPath: string | null;
  modelVersionKey: string;
}

export interface AnalyzeOptions {
  guideBox?: SquareGuideBox | null;
  disableRoiSegmentation?: boolean;
}

let activeAnalysisMode: AnalysisMode = "mobilenetv3";
let activeAnalysisModel: AnalysisModelSelection = PRIMARY_ANALYSIS_MODEL;

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
  analysisSource: "mobilenetv3" | "resnet50"
): ActiveAnalysisPrediction {
  const fallbackModelPath = analysisSource === "resnet50"
    ? getLoadedResNet50ModelPath()
    : getLoadedMobileNetModelPath();

  return {
    classification: result.classification,
    confidenceProbability: result.confidenceProbability,
    confidencePercent: result.confidence,
    probabilities: result.probabilities,
    labelOrder: result.labelOrder,
    freshnessScore: result.freshnessScore,
    recommendation: result.recommendation,
    analysisSource,
    modelPath: result.modelPath ?? fallbackModelPath,
    modelVersionKey: getActiveAnalysisModelVersionKey(),
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
    modelVersionKey: getActiveAnalysisModelVersionKey(),
  };
}

export function setActiveAnalysisMode(mode: AnalysisMode): void {
  activeAnalysisMode = mode;
  if (mode === "ensemble") {
    activeAnalysisModel = "ensemble";
  } else if (mode === "resnet50") {
    activeAnalysisModel = "resnet50";
  } else if (activeAnalysisModel === "resnet50" || activeAnalysisModel === "ensemble") {
    activeAnalysisModel = getActiveMobileNetModelVariant();
  }
}

export function getActiveAnalysisMode(): AnalysisMode {
  return activeAnalysisMode;
}

export function setActiveAnalysisModel(selection: AnalysisModelSelection): void {
  activeAnalysisModel = selection;

  if (selection === "ensemble") {
    activeAnalysisMode = "ensemble";
    setActiveMobileNetModelVariant(PRIMARY_ANALYSIS_MODEL);
    return;
  }

  if (selection === "resnet50") {
    activeAnalysisMode = "resnet50";
    return;
  }

  activeAnalysisMode = "mobilenetv3";
  setActiveMobileNetModelVariant(selection);
}

export function getActiveAnalysisModel(): AnalysisModelSelection {
  return activeAnalysisModel;
}

export function getActiveAnalysisModelVersionKey(): string {
  return getAnalysisModelVersionKey(activeAnalysisModel);
}

export function isAnalysisReady(): boolean {
  if (activeAnalysisMode === "ensemble") {
    return isMobileNetReady() && isResNet50Ready();
  }

  if (activeAnalysisMode === "resnet50") {
    return isResNet50Ready();
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

  if (activeAnalysisMode === "resnet50") {
    await loadResNet50Model(options);
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
  const resolvedOptions: AnalyzeOptions = {
    ...options,
    disableRoiSegmentation:
      options.disableRoiSegmentation ?? DEFAULT_DISABLE_ROI_SEGMENTATION,
  };

  if (activeAnalysisMode === "ensemble") {
    const [mobileNetResult, resNetResult] = await Promise.all([
      classifyWithMobileNetV3(imageFile, resolvedOptions),
      classifyWithResNet50(imageFile, resolvedOptions),
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

  if (activeAnalysisMode === "resnet50") {
    const resNetResult = await classifyWithResNet50(imageFile, resolvedOptions);
    if (!resNetResult) {
      return null;
    }

    return toActiveAnalysisPrediction(resNetResult, "resnet50");
  }

  const mobileNetResult = await classifyWithMobileNetV3(imageFile, resolvedOptions);
  if (!mobileNetResult) {
    return null;
  }

  return toActiveAnalysisPrediction(mobileNetResult, "mobilenetv3");
}
