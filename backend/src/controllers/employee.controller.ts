import type { Request, Response } from "express";
import { created, ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as employeeService from "../services/employee.service.js";

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

export const timeEntries = asyncHandler(async (req: Request, res: Response) => {
  const result = await employeeService.getTimeEntries(String(req.params.id));
  res.json(ok(result));
});

export const clockIn = asyncHandler(async (req: Request, res: Response) => {
  const entry = await employeeService.clockIn(String(req.params.id), req.user?.branchId ?? null);
  res.status(201).json(created(entry, "Clocked in"));
});

export const clockOut = asyncHandler(async (req: Request, res: Response) => {
  const entry = await employeeService.clockOut(String(req.params.id), String(req.body.notes ?? ""));
  res.json(ok(entry, "Clocked out"));
});
