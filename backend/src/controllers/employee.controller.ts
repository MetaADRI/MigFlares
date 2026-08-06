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
