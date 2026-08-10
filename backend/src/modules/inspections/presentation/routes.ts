import { Router } from "express";
import { InspectionController } from "./controllers/InspectionController";
import { resolveTrackedRequestAuthContext } from "../../../middleware/auth";
import { GetInspectionById, GetInspectionController, InspectionServiceGateway } from "..";
import { inspectionService } from "../infrastructure/InspectionService";

const router = Router();
const controller = new InspectionController();
const getInspectionController = new GetInspectionController(
  new GetInspectionById(new InspectionServiceGateway(inspectionService)),
  resolveTrackedRequestAuthContext,
);

router.get("/stats", (req, res) => controller.getStatistics(req, res));
router.get("/", (req, res) => controller.getAll(req, res));
router.get("/:id", (req, res, next) => {
  void getInspectionController.handle(req, res, next);
});
router.post("/", (req, res) => controller.create(req, res));
router.delete("/:id", (req, res) => controller.delete(req, res));

export default router;
