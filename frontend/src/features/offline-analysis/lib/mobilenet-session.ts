import type { MobileNetModelVariant } from "./model-catalog";

export type { MobileNetModelVariant } from "./model-catalog";

export type ModelPreprocessContract = "legacy" | "segmented_center_roi";

export type MobileNetOnnxSession = import("onnxruntime-web").InferenceSession;

/** Owns the mutable ONNX session identity independently from inference code. */
export class MobileNetSession {
  activeModelVariant: MobileNetModelVariant = "primary";
  session: MobileNetOnnxSession | null = null;
  loadedModelPath: string | null = null;
  loadGeneration = 0;

  switchVariant(nextVariant: MobileNetModelVariant): MobileNetOnnxSession | null {
    if (this.activeModelVariant === nextVariant) {
      return null;
    }

    const previousSession = this.session;
    this.activeModelVariant = nextVariant;
    this.loadGeneration += 1;
    this.session = null;
    this.loadedModelPath = null;
    return previousSession;
  }
}
