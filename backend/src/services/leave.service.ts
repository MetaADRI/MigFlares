import { Prisma, LeaveType, LeaveStatus } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";
import { createNotification } from "./notification.service.js";

/* ------------------------------------------------------------------ */
/* Leave — requests, approvals and balances.                           */
/* Balances are derived: ANNUAL entitlement (default 20 days) minus    */
/* days taken on APPROVED requests.                                    */
/* ------------------------------------------------------------------ */

const ANNUAL_ENTITLEMENT = 20;

const startOfDayLocal = (d: Date): Date => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

const employeeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  position: true,
} as const;

type LeaveRow = Prisma.LeaveRequestGetPayload<{
  include: { employee: { select: typeof employeeSelect } };
}>;

function serialize(r: LeaveRow) {
  return {
    id: r.id,
    type: r.type,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    days: Number(r.days),
    status: r.status,
    reason: r.reason,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    reviewNote: r.reviewNote,
    createdAt: r.createdAt.toISOString(),
    ...(r.employee
      ? {
          employee: {
            id: r.employee.id,
            firstName: r.employee.firstName,
            lastName: r.employee.lastName,
            position: r.employee.position,
          },
        }
      : {}),
  };
}

/** Annual/sick/unpaid balances for an employee, derived from APPROVED requests. */
export async function getLeaveBalances(employeeId: string) {
  const approved = await prisma.leaveRequest.findMany({
    where: { employeeId, status: "APPROVED" },
    select: { type: true, days: true },
  });
  const byType = new Map<LeaveType, number>();
  for (const a of approved) {
    byType.set(a.type, (byType.get(a.type) ?? 0) + Number(a.days));
  }
  const annualUsed = byType.get("ANNUAL") ?? 0;
  const pending = await prisma.leaveRequest.aggregate({
    where: { employeeId, status: "PENDING" },
    _sum: { days: true },
  });
  return {
    annual: {
      entitlement: ANNUAL_ENTITLEMENT,
      used: round2(annualUsed),
      remaining: round2(ANNUAL_ENTITLEMENT - annualUsed),
    },
    sickUsed: round2(byType.get("SICK") ?? 0),
    unpaidUsed: round2(byType.get("UNPAID") ?? 0),
    otherUsed: round2(byType.get("OTHER") ?? 0),
    pendingDays: Number(pending._sum.days ?? 0),
  };
}

export interface LeaveRequestInput {
  type?: LeaveType;
  startDate: Date;
  endDate: Date;
  days?: number;
  reason?: string;
}

export async function createLeaveRequest(
  employeeId: string,
  input: LeaveRequestInput,
  branchId: string | null,
) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw ApiError.notFound("Employee not found");

  const start = startOfDayLocal(input.startDate);
  const end = startOfDayLocal(input.endDate);
  if (end.getTime() < start.getTime()) {
    throw ApiError.badRequest("End date must be on or after the start date");
  }
  const computedDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const days = input.days ?? computedDays;
  if (days <= 0) throw ApiError.badRequest("Leave must be at least 1 day");

  const type = input.type ?? "ANNUAL";
  if (type === "ANNUAL") {
    const balances = await getLeaveBalances(employeeId);
    if (days > balances.annual.remaining) {
      throw ApiError.badRequest(
        `Insufficient annual leave balance — ${balances.annual.remaining} day(s) remaining`,
      );
    }
  }

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId,
      type,
      startDate: start,
      endDate: end,
      days: new Prisma.Decimal(days),
      reason: input.reason || null,
      branchId,
    },
  });

  await createNotification({
    branchId,
    title: "New leave request",
    message: `${employee.firstName} ${employee.lastName} requested ${days} day(s) of ${type} leave (${start.toLocaleDateString()} → ${end.toLocaleDateString()}).`,
    type: "INFO",
    category: "EMPLOYEE",
  });

  return serialize({ ...request, employee: null as never });
}

export async function reviewLeaveRequest(
  id: string,
  status: "APPROVED" | "REJECTED",
  reviewNote: string | undefined,
  userId: string | undefined,
) {
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: { select: employeeSelect } },
  });
  if (!request) throw ApiError.notFound("Leave request not found");
  if (request.status !== "PENDING") {
    throw ApiError.conflict("Leave request has already been reviewed");
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status, reviewedById: userId, reviewedAt: new Date(), reviewNote: reviewNote || null },
  });

  await createNotification({
    branchId: request.branchId,
    title: `Leave ${status.toLowerCase()}`,
    message: `${request.employee.firstName} ${request.employee.lastName} — ${Number(
      request.days,
    )} day(s) ${status.toLowerCase()} (${request.type}).`,
    type: status === "APPROVED" ? "SUCCESS" : "WARNING",
    category: "EMPLOYEE",
  });

  return serialize({ ...updated, employee: request.employee });
}

export async function cancelLeaveRequest(id: string) {
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: { select: employeeSelect } },
  });
  if (!request) throw ApiError.notFound("Leave request not found");
  if (request.status === "REJECTED" || request.status === "CANCELLED") {
    throw ApiError.conflict("Leave request can no longer be cancelled");
  }

  const updated = await prisma.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
  return serialize({ ...updated, employee: request.employee });
}

export interface LeaveListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  type?: string;
  employeeId?: string;
}

export async function listLeaveRequests(query: LeaveListQuery, branchId: string | null) {
  const pagination = getPagination(query.page, query.pageSize);
  const where: Prisma.LeaveRequestWhereInput = {};
  if (branchId) where.branchId = branchId;
  if (query.employeeId) where.employeeId = query.employeeId;
  if (query.status && query.status !== "ALL") where.status = query.status as LeaveStatus;
  if (query.type && query.type !== "ALL") where.type = query.type as LeaveType;
  if (query.search) {
    where.employee = {
      OR: [
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
        { position: { contains: query.search, mode: "insensitive" } },
      ],
    };
  }

  const [rows, total] = await prisma.$transaction([
    prisma.leaveRequest.findMany({
      where,
      include: { employee: { select: employeeSelect } },
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return { data: rows.map(serialize), ...buildPageMeta(total, pagination) };
}

export async function getMyLeave(employeeId: string, query: LeaveListQuery) {
  return listLeaveRequests({ ...query, employeeId }, null);
}

/** Number of leave requests awaiting review (dashboard / notification badge). */
export async function getPendingLeaveCount(branchId: string | null) {
  return prisma.leaveRequest.count({
    where: { status: "PENDING", ...(branchId ? { branchId } : {}) },
  });
}
