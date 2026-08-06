import { Router } from "express";
import * as auditController from "../controllers/audit.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();

router.use(requireAuth, requirePermission("audit-logs:view"));

router.get("/actions", auditController.actions);
router.get("/", auditController.list);

export default router;
