import { Router } from "express";
import * as payrollController from "../controllers/payroll.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamsSchema } from "../validation/common.validation.js";
import {
  generateRunSchema,
  markPaidSchema,
  payrollRuleSchema,
  payslipAdjustSchema,
  runQuerySchema,
} from "../validation/payroll.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/rule", requirePermission("payroll:view"), payrollController.getRule);
router.put("/rule", requirePermission("payroll:manage"), validate(payrollRuleSchema), payrollController.updateRule);

router.get("/runs", requirePermission("payroll:view"), validate(runQuerySchema, "query"), payrollController.listRuns);
router.get("/runs/:id", requirePermission("payroll:view"), validate(idParamsSchema, "params"), payrollController.getRun);
router.post("/runs", requirePermission("payroll:manage"), validate(generateRunSchema), payrollController.generate);
router.post(
  "/runs/:id/process",
  requirePermission("payroll:manage"),
  validate(idParamsSchema, "params"),
  payrollController.processRun,
);
router.post(
  "/runs/:id/paid",
  requirePermission("payroll:manage"),
  validate(idParamsSchema, "params"),
  validate(markPaidSchema),
  payrollController.markRunPaid,
);

router.get("/payday", requirePermission("payroll:view"), payrollController.paydayReminders);

router.patch(
  "/payslips/:id",
  requirePermission("payroll:manage"),
  validate(idParamsSchema, "params"),
  validate(payslipAdjustSchema),
  payrollController.adjustPayslip,
);
router.post(
  "/payslips/:id/paid",
  requirePermission("payroll:manage"),
  validate(idParamsSchema, "params"),
  validate(markPaidSchema),
  payrollController.markPayslipPaid,
);

export default router;
