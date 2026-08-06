import { Router } from "express";
import * as attendanceController from "../controllers/attendance.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamsSchema } from "../validation/common.validation.js";
import { attendanceCorrectionSchema, attendanceQuerySchema } from "../validation/attendance.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("attendance:view"), validate(attendanceQuerySchema, "query"), attendanceController.list);
router.get("/today", requirePermission("attendance:view"), attendanceController.today);
router.patch(
  "/:id",
  requirePermission("attendance:manage"),
  validate(idParamsSchema, "params"),
  validate(attendanceCorrectionSchema),
  attendanceController.correct,
);

export default router;
