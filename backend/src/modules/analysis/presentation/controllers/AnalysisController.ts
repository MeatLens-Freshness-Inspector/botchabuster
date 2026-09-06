import { Request, Response } from "express";
import { RetiredServerAnalysis } from "../../application/RetiredServerAnalysis";

export class AnalysisController {
  private readonly retiredAnalysis = new RetiredServerAnalysis();
  async analyze(req: Request, res: Response): Promise<void> {
    const image = req.transportFiles?.image;
    if (image && !["image/jpeg", "image/png", "image/webp"].includes(image.mimeType)) {
      res.status(400).json({ error: "Only JPEG, PNG, and WebP images are allowed" });
      return;
    }
    const result = this.retiredAnalysis.execute(Boolean(image));
    res.status(result.status).json(result.body);
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
