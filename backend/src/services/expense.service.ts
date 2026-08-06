import type { ExpenseCategory, ExpenseStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";
import { logAction } from "./audit.service.js";
import { createNotification } from "./notification.service.js";

export interface ExpenseListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  month?: string;
  category?: ExpenseCategory;
  status?: ExpenseStatus;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface ExpenseInput {
  amount?: number;
  category?: ExpenseCategory;
  vendor?: string | null;
  description?: string | null;
  receiptUrl?: string | null;
  paymentMethod?: "CASH" | "MOBILE_MONEY" | "CARD" | "BANK_TRANSFER";
  expenseDate?: Date;
  employeeId?: string | null;
}

type ExpenseRow = Prisma.ExpenseGetPayload<{
  include: { createdBy: { select: { fullName: true } }; employee: { select: { firstName: true; lastName: true } } };
}>;

function serialize(expense: ExpenseRow) {
  return {
    id: expense.id,
    amount: Number(expense.amount),
    category: expense.category,
    vendor: expense.vendor,
    description: expense.description,
    receiptUrl: expense.receiptUrl,
    paymentMethod: expense.paymentMethod,
    expenseDate: expense.expenseDate.toISOString(),
    status: expense.status,
    createdByName: expense.createdBy?.fullName ?? null,
    employeeName: expense.employee
      ? `${expense.employee.firstName} ${expense.employee.lastName}`
      : null,
    approvedAt: expense.approvedAt?.toISOString() ?? null,
    createdAt: expense.createdAt.toISOString(),
  };
}

const expenseInclude = {
  createdBy: { select: { fullName: true } },
  employee: { select: { firstName: true, lastName: true } },
} satisfies Prisma.ExpenseInclude;

function buildWhere(query: ExpenseListQuery, branchId: string | null): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = {};
  if (branchId) where.branchId = branchId;
  if (query.category) where.category = query.category;
  if (query.status) where.status = query.status;
  if (query.month) {
    const [year, month] = query.month.split("-").map(Number);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1);
    where.expenseDate = { gte: from, lt: to };
  }
  if (query.search) {
    where.OR = [
      { vendor: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listExpenses(query: ExpenseListQuery, branchId: string | null) {
  const pagination = getPagination(query.page, query.pageSize);
  const where = buildWhere(query, branchId);
  const dir = query.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.ExpenseOrderByWithRelationInput =
    query.sortBy === "amount" || query.sortBy === "expenseDate"
      ? { [query.sortBy]: dir }
      : { expenseDate: "desc" };

  const [rows, total] = await prisma.$transaction([
    prisma.expense.findMany({ where, orderBy, skip: pagination.skip, take: pagination.take, include: expenseInclude }),
    prisma.expense.count({ where }),
  ]);

  return { data: rows.map(serialize), ...buildPageMeta(total, pagination) };
}

export async function getExpense(id: string) {
  const expense = await prisma.expense.findUnique({ where: { id }, include: expenseInclude });
  if (!expense) throw ApiError.notFound("Expense not found");
  return serialize(expense);
}

export async function createExpense(input: ExpenseInput, userId: string, branchId: string | null) {
  const expense = await prisma.expense.create({
    data: {
      amount: input.amount!,
      category: input.category!,
      vendor: input.vendor || null,
      description: input.description || null,
      receiptUrl: input.receiptUrl || null,
      paymentMethod: input.paymentMethod!,
      expenseDate: input.expenseDate ?? new Date(),
      employeeId: input.employeeId ?? null,
      createdById: userId,
      branchId,
    },
    include: expenseInclude,
  });
  return serialize(expense);
}

export async function updateExpense(id: string, input: ExpenseInput) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Expense not found");
  const expense = await prisma.expense.update({
    where: { id },
    data: {
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.vendor !== undefined && { vendor: input.vendor || null }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(input.receiptUrl !== undefined && { receiptUrl: input.receiptUrl || null }),
      ...(input.paymentMethod !== undefined && { paymentMethod: input.paymentMethod }),
      ...(input.expenseDate !== undefined && { expenseDate: input.expenseDate }),
      ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
    },
    include: expenseInclude,
  });
  return serialize(expense);
}

export async function setExpenseStatus(id: string, status: ExpenseStatus, userId: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Expense not found");
  const expense = await prisma.expense.update({
    where: { id },
    data: {
      status,
      approvedById: status === "PENDING" ? null : userId,
      approvedAt: status === "PENDING" ? null : new Date(),
    },
    include: expenseInclude,
  });

  if (status === "APPROVED" || status === "REJECTED") {
    await createNotification({
      title: `Expense ${status === "APPROVED" ? "approved" : "rejected"}`,
      message: `${expense.vendor ?? expense.category} · ${Number(expense.amount).toFixed(2)}`,
      type: status === "APPROVED" ? "SUCCESS" : "WARNING",
      category: "EXPENSE",
      branchId: expense.branchId,
    });
    await logAction({
      action: status === "APPROVED" ? "EXPENSE_APPROVED" : "EXPENSE_REJECTED",
      entity: "Expense",
      entityId: expense.id,
      userId,
      branchId: expense.branchId ?? null,
      oldValue: { status: existing.status },
      newValue: { status },
    });
  }
  return serialize(expense);
}

export async function deleteExpense(id: string): Promise<void> {
  await prisma.expense
    .delete({ where: { id } })
    .catch(() => {
      throw ApiError.notFound("Expense not found");
    });
}

export async function getStats(branchId: string | null) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const whereBase: Prisma.ExpenseWhereInput = branchId ? { branchId } : {};

  const [monthly, today, pending, largest] = await Promise.all([
    prisma.expense.aggregate({
      where: { ...whereBase, expenseDate: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { ...whereBase, expenseDate: { gte: dayStart } },
      _sum: { amount: true },
    }),
    prisma.expense.count({ where: { ...whereBase, status: "PENDING" } }),
    prisma.expense.findFirst({
      where: { ...whereBase, expenseDate: { gte: monthStart } },
      orderBy: { amount: "desc" },
      select: { amount: true, category: true, vendor: true, expenseDate: true },
    }),
  ]);

  return {
    monthlyExpenses: Number(monthly._sum.amount ?? 0),
    todayExpenses: Number(today._sum.amount ?? 0),
    pendingApprovals: pending,
    largestExpense: largest
      ? {
          amount: Number(largest.amount),
          category: largest.category,
          vendor: largest.vendor,
          expenseDate: largest.expenseDate.toISOString(),
        }
      : null,
  };
}

/** All rows matching the filters, serialized for CSV export. */
export async function exportExpenses(query: ExpenseListQuery, branchId: string | null) {
  const rows = await prisma.expense.findMany({
    where: buildWhere(query, branchId),
    orderBy: { expenseDate: "desc" },
    include: expenseInclude,
  });
  return rows.map(serialize);
}
