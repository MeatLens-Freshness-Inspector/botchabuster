import { Router } from "express";
import { AnalysisController } from "./controllers/AnalysisController";
import { upload } from "../../../middleware/upload";

const router = Router();
const controller = new AnalysisController();

router.post("/analyze", upload.single("image"), (req, res) =>
  controller.analyze(req, res)
);

router.get("/health", (req, res) => controller.health(req, res));

export default router;
