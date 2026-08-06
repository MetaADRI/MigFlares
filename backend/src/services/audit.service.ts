import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";

/* ------------------------------------------------------------------ */
/* Audit logging — every important action is recorded for review.      */
/* ------------------------------------------------------------------ */

export interface AuditLogInput {
  action: string;
  entity: string;
  entityId?: string | null;
  userId?: string | null;
  branchId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  details?: unknown;
  ipAddress?: string | null;
}

/** Best-effort audit entry — never throws into the caller's flow. */
export async function logAction(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entity: input.entity,
      entityId: input.entityId ?? null,
      userId: input.userId ?? null,
      branchId: input.branchId ?? null,
      oldValue: (input.oldValue ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      newValue: (input.newValue ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      details: (input.details ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      ipAddress: input.ipAddress ?? null,
      },
    });
  } catch {
    /* audit must never break the primary operation */
  }
}

export interface AuditListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  action?: string;
  entity?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortDir?: "asc" | "desc";
}

const include = {
  user: { select: { id: true, username: true, fullName: true } },
} satisfies Prisma.AuditLogInclude;

export async function listAuditLogs(query: AuditListQuery, branchId: string | null) {
  const pagination = getPagination(query.page, query.pageSize);
  const where: Prisma.AuditLogWhereInput = {};

  if (branchId) where.branchId = branchId;
  if (query.action) where.action = query.action;
  if (query.entity) where.entity = query.entity;
  if (query.userId) where.userId = query.userId;
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {
      ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { lt: new Date(new Date(query.dateTo).getTime() + 24 * 3600_000) } : {}),
    };
  }
  if (query.search) {
    where.OR = [
      { action: { contains: query.search, mode: "insensitive" } },
      { entity: { contains: query.search, mode: "insensitive" } },
      { user: { fullName: { contains: query.search, mode: "insensitive" } } },
    ];
  }

  const [rows, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: query.sortDir === "asc" ? "asc" : "desc" },
      skip: pagination.skip,
      take: pagination.take,
      include,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    userName: row.user?.fullName ?? "System",
    username: row.user?.username ?? null,
    oldValue: row.oldValue as Record<string, unknown> | null,
    newValue: row.newValue as Record<string, unknown> | null,
    details: row.details as Record<string, unknown> | null,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
  }));

  return { data, ...buildPageMeta(total, pagination) };
}

/** Distinct actions for filter dropdowns. */
export async function listActionTypes(): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  });
  return rows.map((r) => r.action);
}
