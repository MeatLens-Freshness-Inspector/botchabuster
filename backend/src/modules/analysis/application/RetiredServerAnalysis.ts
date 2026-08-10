export class RetiredServerAnalysis {
  execute(hasImage: boolean): { status: 400 | 410; body: Record<string, string> } {
    if (!hasImage) return { status: 400, body: { error: "No image file provided" } };
    return {
      status: 410,
      body: {
        error: "Server-side analysis has been retired",
        message: "Run MobileNetV3 analysis in the frontend before submitting inspection records.",
      },
    };
  }
}
