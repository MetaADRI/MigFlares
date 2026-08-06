import { Router } from "express";
import * as settingsController from "../controllers/settings.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("settings:view"), settingsController.get);
router.put("/", requirePermission("settings:manage"), settingsController.update);

export default router;
