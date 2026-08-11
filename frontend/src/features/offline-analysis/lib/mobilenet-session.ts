export type MobileNetModelVariant = "default" | "seed123_model2";

export type ModelPreprocessContract = "legacy" | "segmented_center_roi";

export type MobileNetOnnxSession = import("onnxruntime-web").InferenceSession;

/** Owns the mutable ONNX session identity independently from inference code. */
export class MobileNetSession {
  activeModelVariant: MobileNetModelVariant = "seed123_model2";
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
