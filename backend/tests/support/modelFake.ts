export interface FreshnessPrediction {
  label: "fresh" | "not_fresh" | "spoiled";
  confidence: number;
  probabilities: {
    fresh: number;
    not_fresh: number;
    spoiled: number;
  };
  modelVersion: string;
  inferenceTimeMs: number;
}

export class FakeModelGateway {
  readonly calls: Array<{ image: Buffer; meatType: string }> = [];

  constructor(private readonly prediction: FreshnessPrediction = {
    label: "fresh",
    confidence: 0.91,
    probabilities: {
      fresh: 0.91,
      not_fresh: 0.06,
      spoiled: 0.03,
    },
    modelVersion: "test-model-v1",
    inferenceTimeMs: 42,
  }) {}

  async analyze(image: Buffer, meatType: string): Promise<FreshnessPrediction> {
    this.calls.push({ image, meatType });
    return this.prediction;
  }
}
