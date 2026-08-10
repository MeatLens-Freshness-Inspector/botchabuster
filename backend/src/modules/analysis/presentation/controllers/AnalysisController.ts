import { Request, Response } from "express";

export class AnalysisController {
  async analyze(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    res.status(410).json({
      error: "Server-side analysis has been retired",
      message: "Run MobileNetV3 analysis in the frontend before submitting inspection records.",
    });
  }

  async health(_req: Request, res: Response): Promise<void> {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        analysis: "client-model-only",
      },
    });
  }
}
