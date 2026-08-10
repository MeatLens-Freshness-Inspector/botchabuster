import { Request, Response } from "express";
import { RetiredServerAnalysis } from "../../application/RetiredServerAnalysis";

export class AnalysisController {
  private readonly retiredAnalysis = new RetiredServerAnalysis();
  async analyze(req: Request, res: Response): Promise<void> {
    const result = this.retiredAnalysis.execute(Boolean(req.file));
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
