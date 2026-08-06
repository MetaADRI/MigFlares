import type { Request, Response } from "express";
import { prisma } from "../config/database.js";
import { created, ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { requireOwnEmployee } from "../utils/employee-access.js";
import * as employeeService from "../services/employee.service.js";
import * as attendanceService from "../services/attendance.service.js";
import * as leaveService from "../services/leave.service.js";
import * as payrollService from "../services/payroll.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await employeeService.listEmployees(
    req.query as unknown as employeeService.EmployeeListQuery,
    req.user?.branchId ?? null,
  );
  res.json(ok(result));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.getEmployee(String(req.params.id));
  res.json(ok(employee));
});

export const stats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await employeeService.getEmployeeStats(String(req.params.id));
  res.json(ok(stats));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.createEmployee(req.body, req.user?.branchId ?? null);
  res.status(201).json(created(employee, "Employee added"));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.updateEmployee(String(req.params.id), req.body);
  res.json(ok(employee, "Employee updated"));
});

export const suspend = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.suspendEmployee(String(req.params.id), Boolean(req.body.isActive));
  res.json(ok(employee, req.body.isActive ? "Employee reactivated" : "Employee suspended"));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await employeeService.deleteEmployee(String(req.params.id));
  res.json(ok(null, "Employee deleted"));
});

export const salaryHistory = asyncHandler(async (req: Request, res: Response) => {
  const result = await employeeService.getSalaryHistory(String(req.params.id));
  res.json(ok(result));
});

export const recordSalary = asyncHandler(async (req: Request, res: Response) => {
  const payment = await employeeService.recordSalaryPayment(
    String(req.params.id),
    req.body,
    req.user?.sub,
    req.user?.branchId ?? null,
  );
  res.status(201).json(created(payment, "Salary payment recorded"));
});

/* ------------------------------------------------------------------ */
/* Self-service (/employees/me/*) — resolved from the logged-in user.  */
/* ------------------------------------------------------------------ */

export const myAttendance = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await requireOwnEmployee(req.user!.sub);
  const result = await attendanceService.getMyAttendance(
    employeeId,
    req.query as unknown as attendanceService.AttendanceListQuery,
  );
  res.json(ok(result));
});

export const myLeave = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await requireOwnEmployee(req.user!.sub);
  const result = await leaveService.getMyLeave(
    employeeId,
    req.query as unknown as leaveService.LeaveListQuery,
  );
  res.json(ok(result));
});

export const myLeaveBalances = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await requireOwnEmployee(req.user!.sub);
  const balances = await leaveService.getLeaveBalances(employeeId);
  res.json(ok(balances));
});

export const myCreateLeave = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await requireOwnEmployee(req.user!.sub);
  const request = await leaveService.createLeaveRequest(
    employeeId,
    req.body,
    req.user?.branchId ?? null,
  );
  res.status(201).json(created(request, "Leave requested"));
});

export const myCancelLeave = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await requireOwnEmployee(req.user!.sub);
  const existing = await prisma.leaveRequest.findUnique({
    where: { id: String(req.params.id) },
    select: { employeeId: true },
  });
  if (!existing || existing.employeeId !== employeeId) throw ApiError.forbidden();
  const request = await leaveService.cancelLeaveRequest(String(req.params.id));
  res.json(ok(request, "Leave request cancelled"));
});

export const myPayslips = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await requireOwnEmployee(req.user!.sub);
  const result = await payrollService.getMyPayslips(
    employeeId,
    req.query as unknown as payrollService.PayslipQuery,
  );
  res.json(ok(result));
});

export const myPayrollSummary = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await requireOwnEmployee(req.user!.sub);
  const summary = await payrollService.getMyPayrollSummary(employeeId);
  res.json(ok(summary));
});
