import { Router } from "express";
import * as analyticsController from "../controllers/analytics.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();

router.use(requireAuth, requirePermission("analytics:view"));

router.get("/overview", analyticsController.overview);

export default router;
