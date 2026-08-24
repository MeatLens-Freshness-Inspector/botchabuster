import { Router } from "express";
import { DeveloperDashboardController } from "./controllers/DeveloperDashboardController";
import { developerPackageUpload } from "../../../middleware/developerPackageUpload";
import { requireDeveloper } from "../../../middleware/auth";
import { requireAdmin } from "../../../middleware/auth";
import { InspectionResultDisputeController } from "../../inspections/presentation/controllers/InspectionResultDisputeController";

const router = Router();
const controller = new DeveloperDashboardController();
const disputeController = new InspectionResultDisputeController();

router.get("/overview", requireDeveloper, (req, res) => controller.getOverview(req, res));
router.get("/datasets", requireDeveloper, (req, res) => controller.getDatasets(req, res));
router.get("/disputes", requireAdmin, (req, res) => void disputeController.listPendingForReview(req, res));
router.post("/disputes/:disputeId/apply-developer-label", requireDeveloper, (req, res) =>
  void disputeController.applyToDeveloperDataset(req, res),
);
router.post("/disputes/:disputeId/review", requireAdmin, (req, res) =>
  void disputeController.review(req, res),
);
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
