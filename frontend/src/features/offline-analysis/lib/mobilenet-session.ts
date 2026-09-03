import type { MeatLensModelMetadata } from "./meat-lens-pipeline";
import { MOBILE_NET_MODEL_VARIANTS, type MobileNetModelVariant } from "./model-catalog";

export type { MobileNetModelVariant } from "./model-catalog";

export type ModelPreprocessContract = "legacy" | "segmented_center_roi";

export type MobileNetOnnxSession = import("onnxruntime-web").InferenceSession;

export interface MobileNetRuntimeEntry {
  session: MobileNetOnnxSession | null;
  loadedModelPath: string | null;
  loadPromise: Promise<boolean> | null;
  metadataPromise: Promise<MeatLensModelMetadata> | null;
  nextRetryAt: number;
  loadGeneration: number;
}

function createRuntimeEntry(): MobileNetRuntimeEntry {
  return {
    session: null,
    loadedModelPath: null,
    loadPromise: null,
    metadataPromise: null,
    nextRetryAt: 0,
    loadGeneration: 0,
  };
}

/** Owns the mutable ONNX session identity independently from inference code. */
export class MobileNetSession {
  activeModelVariant: MobileNetModelVariant = "primary";
  readonly runtimes: Record<MobileNetModelVariant, MobileNetRuntimeEntry> = Object.fromEntries(
    MOBILE_NET_MODEL_VARIANTS.map((variant) => [variant, createRuntimeEntry()]),
  ) as Record<MobileNetModelVariant, MobileNetRuntimeEntry>;

  getRuntime(variant: MobileNetModelVariant = this.activeModelVariant): MobileNetRuntimeEntry {
    return this.runtimes[variant];
  }

  get session(): MobileNetOnnxSession | null {
    return this.getRuntime().session;
  }

  set session(value: MobileNetOnnxSession | null) {
    this.getRuntime().session = value;
  }

  get loadedModelPath(): string | null {
    return this.getRuntime().loadedModelPath;
  }

  set loadedModelPath(value: string | null) {
    this.getRuntime().loadedModelPath = value;
  }

  get loadGeneration(): number {
    return this.getRuntime().loadGeneration;
  }

  switchVariant(nextVariant: MobileNetModelVariant): MobileNetOnnxSession | null {
    if (this.activeModelVariant === nextVariant) {
      return null;
    }

    const previousSession = this.session;
    this.activeModelVariant = nextVariant;
    return previousSession;
  }

  resetVariant(variant: MobileNetModelVariant = this.activeModelVariant): MobileNetOnnxSession | null {
    const runtime = this.getRuntime(variant);
    const previousSession = runtime.session;
    runtime.loadGeneration += 1;
    runtime.session = null;
    runtime.loadedModelPath = null;
    runtime.loadPromise = null;
    runtime.metadataPromise = null;
    runtime.nextRetryAt = 0;
    return previousSession;
  }
}
