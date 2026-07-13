import { Router } from "express";
import { DeveloperDashboardController } from "../controllers/DeveloperDashboardController";
import { developerPackageUpload } from "../middleware/developerPackageUpload";
import { requireDeveloper } from "../middleware/auth";

const router = Router();
const controller = new DeveloperDashboardController();

router.get("/overview", requireDeveloper, (req, res) => controller.getOverview(req, res));
router.get("/datasets", requireDeveloper, (req, res) => controller.getDatasets(req, res));
router.post("/datasets/export", requireDeveloper, (req, res) => controller.exportDatasets(req, res));
router.patch("/datasets/:inspectionId/manual-classification", requireDeveloper, (req, res) =>
  controller.updateDatasetManualClassification(req, res),
);
router.get("/training-runs", requireDeveloper, (req, res) => controller.listTrainingRuns(req, res));
router.post(
  "/training-runs/import",
  requireDeveloper,
  developerPackageUpload.single("package"),
  (req, res) => controller.importTrainingRun(req, res),
);

export default router;
