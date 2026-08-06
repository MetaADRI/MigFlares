import { Router } from "express";
import * as employeeController from "../controllers/employee.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { idParamsSchema } from "../validation/common.validation.js";
import { attendanceQuerySchema } from "../validation/attendance.validation.js";
import { leaveCreateSchema, leaveIdParamsSchema, leaveQuerySchema } from "../validation/leave.validation.js";
import { payslipQuerySchema } from "../validation/payroll.validation.js";
import {
  employeeCreateSchema,
  employeeQuerySchema,
  employeeSuspendSchema,
  employeeUpdateSchema,
  salaryPaymentSchema,
} from "../validation/employee.validation.js";

const router = Router();

router.use(requireAuth);

/* Self-service — resolved from the logged-in user, no role gate needed. */
router.get("/me/attendance", validate(attendanceQuerySchema, "query"), employeeController.myAttendance);
router.get("/me/leave", validate(leaveQuerySchema, "query"), employeeController.myLeave);
router.get("/me/leave/balances", employeeController.myLeaveBalances);
router.post("/me/leave", validate(leaveCreateSchema), employeeController.myCreateLeave);
router.post(
  "/me/leave/:id/cancel",
  validate(leaveIdParamsSchema, "params"),
  employeeController.myCancelLeave,
);
router.get("/me/payslips", validate(payslipQuerySchema, "query"), employeeController.myPayslips);
router.get("/me/payroll", employeeController.myPayrollSummary);

router.get("/", requirePermission("employees:view"), validate(employeeQuerySchema, "query"), employeeController.list);
router.post("/", requirePermission("employees:manage"), validate(employeeCreateSchema), employeeController.create);
router.get("/:id/stats", requirePermission("employees:view"), validate(idParamsSchema, "params"), employeeController.stats);
router.get("/:id/salary-history", requirePermission("employees:view"), validate(idParamsSchema, "params"), employeeController.salaryHistory);
router.post(
  "/:id/salary-payments",
  requirePermission("employees:manage"),
  validate(idParamsSchema, "params"),
  validate(salaryPaymentSchema),
  employeeController.recordSalary,
);
router.get("/:id", requirePermission("employees:view"), validate(idParamsSchema, "params"), employeeController.get);
router.patch("/:id", requirePermission("employees:manage"), validate(idParamsSchema, "params"), validate(employeeUpdateSchema), employeeController.update);
router.patch("/:id/suspend", requirePermission("employees:manage"), validate(idParamsSchema, "params"), validate(employeeSuspendSchema), employeeController.suspend);
router.delete("/:id", requirePermission("employees:manage"), validate(idParamsSchema, "params"), employeeController.remove);

export default router;
