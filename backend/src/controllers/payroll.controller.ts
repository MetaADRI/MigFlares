import type { Request, Response } from "express";
import { created, ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as payrollService from "../services/payroll.service.js";

export const getRule = asyncHandler(async (req: Request, res: Response) => {
  const rule = await payrollService.getPayrollRule(req.user?.branchId ?? null);
  res.json(ok(rule));
});

export const updateRule = asyncHandler(async (req: Request, res: Response) => {
  const rule = await payrollService.upsertPayrollRule(
    req.user?.branchId ?? null,
    req.body,
    req.user?.sub,
  );
  res.json(ok(rule, "Payroll rule saved"));
});

export const listRuns = asyncHandler(async (req: Request, res: Response) => {
  const result = await payrollService.listPayrollRuns(
    req.query as unknown as payrollService.RunQuery,
    req.user?.branchId ?? null,
  );
  res.json(ok(result));
});

export const getRun = asyncHandler(async (req: Request, res: Response) => {
  const run = await payrollService.getPayrollRun(
    String(req.params.id),
    req.user?.branchId ?? null,
  );
  res.json(ok(run));
});

export const generate = asyncHandler(async (req: Request, res: Response) => {
  const run = await payrollService.generateRun(
    req.body.periodMonth,
    req.user?.branchId ?? null,
    req.user?.sub,
  );
  res.status(201).json(created(run, "Payroll run generated"));
});

export const adjustPayslip = asyncHandler(async (req: Request, res: Response) => {
  const slip = await payrollService.updatePayslip(String(req.params.id), req.body);
  res.json(ok(slip, "Payslip updated"));
});

export const processRun = asyncHandler(async (req: Request, res: Response) => {
  const run = await payrollService.processRun(
    String(req.params.id),
    req.user?.sub,
    req.user?.branchId ?? null,
  );
  res.json(ok(run, "Payroll run processed"));
});

export const markRunPaid = asyncHandler(async (req: Request, res: Response) => {
  const run = await payrollService.markRunPaid(
    String(req.params.id),
    req.body.paymentMethod,
    req.user?.sub,
    req.user?.branchId ?? null,
  );
  res.json(ok(run, "Payroll marked as paid"));
});

export const markPayslipPaid = asyncHandler(async (req: Request, res: Response) => {
  const run = await payrollService.markPayslipPaid(
    String(req.params.id),
    req.body.paymentMethod,
    req.user?.sub,
  );
  res.json(ok(run, "Payslip marked as paid"));
});

export const paydayReminders = asyncHandler(async (req: Request, res: Response) => {
  const reminders = await payrollService.paydayReminders(req.user?.branchId ?? null);
  res.json(ok(reminders));
});

export const myPayslips = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = String(req.params.employeeId);
  const result = await payrollService.getMyPayslips(
    employeeId,
    req.query as unknown as payrollService.PayslipQuery,
  );
  res.json(ok(result));
});

export const mySummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await payrollService.getMyPayrollSummary(String(req.params.employeeId));
  res.json(ok(summary));
});
