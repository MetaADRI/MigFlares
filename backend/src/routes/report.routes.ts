import { Router } from "express";
import * as reportController from "../controllers/report.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();

router.use(requireAuth, requirePermission("reports:view"));

router.get("/", reportController.generate);
router.get("/export.csv", reportController.exportCsv);

export default router;
