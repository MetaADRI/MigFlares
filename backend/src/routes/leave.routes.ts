import { Router } from "express";
import * as leaveController from "../controllers/leave.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  employeeIdParamsSchema,
  leaveCreateSchema,
  leaveIdParamsSchema,
  leaveQuerySchema,
  leaveReviewSchema,
} from "../validation/leave.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("leave:view"), validate(leaveQuerySchema, "query"), leaveController.list);
router.get("/pending-count", requirePermission("leave:view"), leaveController.pendingCount);
router.get(
  "/balances/:employeeId",
  requirePermission("leave:view"),
  validate(employeeIdParamsSchema, "params"),
  leaveController.balances,
);
router.post(
  "/:employeeId",
  requirePermission("leave:view"),
  validate(employeeIdParamsSchema, "params"),
  validate(leaveCreateSchema),
  leaveController.create,
);
router.patch(
  "/:id/review",
  requirePermission("leave:manage"),
  validate(leaveIdParamsSchema, "params"),
  validate(leaveReviewSchema),
  leaveController.review,
);
router.post(
  "/:id/cancel",
  requirePermission("leave:view"),
  validate(leaveIdParamsSchema, "params"),
  leaveController.cancel,
);

export default router;
