import { Router } from "express";
import { AnalysisController } from "./controllers/AnalysisController";

const router = Router();
const controller = new AnalysisController();

router.post("/analyze", (req, res) =>
  controller.analyze(req, res)
);

router.get("/health", (req, res) => controller.health(req, res));

export default router;
