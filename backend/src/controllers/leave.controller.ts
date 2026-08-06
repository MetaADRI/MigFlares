import type { Request, Response } from "express";
import { prisma } from "../config/database.js";
import { created, ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { hasPermission, requireOwnEmployee } from "../utils/employee-access.js";
import * as leaveService from "../services/leave.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await leaveService.listLeaveRequests(
    req.query as unknown as leaveService.LeaveListQuery,
    req.user?.branchId ?? null,
  );
  res.json(ok(result));
});

export const pendingCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await leaveService.getPendingLeaveCount(req.user?.branchId ?? null);
  res.json(ok({ count }));
});

export const balances = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = String(req.params.employeeId);
  if (!hasPermission(req.user, "leave:manage")) {
    const own = await requireOwnEmployee(req.user!.sub);
    if (own !== employeeId) throw ApiError.forbidden();
  }
  const balances = await leaveService.getLeaveBalances(employeeId);
  res.json(ok(balances));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = String(req.params.employeeId);
  if (!hasPermission(req.user, "leave:manage")) {
    const own = await requireOwnEmployee(req.user!.sub);
    if (own !== employeeId) throw ApiError.forbidden();
  }
  const request = await leaveService.createLeaveRequest(
    employeeId,
    req.body,
    req.user?.branchId ?? null,
  );
  res.status(201).json(created(request, "Leave requested"));
});

export const review = asyncHandler(async (req: Request, res: Response) => {
  const request = await leaveService.reviewLeaveRequest(
    String(req.params.id),
    req.body.status,
    req.body.reviewNote,
    req.user?.sub,
  );
  res.json(ok(request, `Leave ${req.body.status.toLowerCase()}`));
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!hasPermission(req.user, "leave:manage")) {
    const own = await requireOwnEmployee(req.user!.sub);
    const existing = await prisma.leaveRequest.findUnique({
      where: { id },
      select: { employeeId: true },
    });
    if (!existing || existing.employeeId !== own) throw ApiError.forbidden();
  }
  const request = await leaveService.cancelLeaveRequest(id);
  res.json(ok(request, "Leave request cancelled"));
});
