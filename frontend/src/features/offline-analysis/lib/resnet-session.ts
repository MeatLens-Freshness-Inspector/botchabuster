export type ResNetOnnxSession = import("onnxruntime-web").InferenceSession;

/** Owns mutable ResNet runtime identity separately from model inference. */
export class ResNetSession {
  session: ResNetOnnxSession | null = null;
  loadedModelPath: string | null = null;
  loadGeneration = 0;

  reset(): ResNetOnnxSession | null {
    const previousSession = this.session;
    this.loadGeneration += 1;
    this.session = null;
    this.loadedModelPath = null;
    return previousSession;
  }
}
