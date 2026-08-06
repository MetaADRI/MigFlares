import { Prisma, PaymentMethod, EmploymentType } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";
import * as attendanceService from "./attendance.service.js";

export interface EmployeeListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  position?: string;
  status?: "active" | "suspended";
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface EmergencyContactInput {
  name?: string;
  phone?: string;
  relation?: string;
}

export interface EmployeeInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string | null;
  avatarUrl?: string | null;
  nrcNumber?: string | null;
  position?: string;
  hireDate?: Date;
  salary?: number | null;
  emergencyContact?: EmergencyContactInput | null;
  notes?: string | null;
  payday?: number | null;
  employmentType?: EmploymentType;
  payrollEnabled?: boolean;
  attendanceRequired?: boolean;
  overtimeEligible?: boolean;
}

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const startOfWeek = (d: Date) => {
  const copy = startOfDay(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
  return copy;
};

const startOfMonth = (d: Date) => {
  const copy = startOfDay(d);
  copy.setDate(1);
  return copy;
};

function serialize(
  e: Prisma.EmployeeGetPayload<{
    include: { _count: { select: { washRecords: true } }; expenses: { select: { id: true } } };
  }>,
) {
  const emergency = e.emergencyContact as { name?: string; phone?: string; relation?: string } | null;
  return {
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    name: `${e.firstName} ${e.lastName}`,
    phone: e.phone,
    email: e.email,
    avatarUrl: e.avatarUrl,
    nrcNumber: e.nrcNumber,
    position: e.position,
    hireDate: e.hireDate.toISOString(),
    salary: e.salary ? Number(e.salary) : null,
    emergencyContact: emergency
      ? { name: emergency.name ?? "", phone: emergency.phone ?? "", relation: emergency.relation ?? "" }
      : null,
    notes: e.notes,
    isActive: e.isActive,
    payday: e.payday,
    employmentType: e.employmentType,
    payrollEnabled: e.payrollEnabled,
    attendanceRequired: e.attendanceRequired,
    overtimeEligible: e.overtimeEligible,
    washesToday: 0, // filled by list/get with today's count
    totalWashes: e._count.washRecords,
    expensesCount: e.expenses.length,
  };
}

const todayCountWhere = () => ({ createdAt: { gte: startOfDay(new Date()) } });

export async function listEmployees(query: EmployeeListQuery, branchId: string | null) {
  const pagination = getPagination(query.page, query.pageSize);
  const where: Prisma.EmployeeWhereInput = {};
  if (branchId) where.branchId = branchId;
  if (query.position) where.position = query.position;
  if (query.status === "active") where.isActive = true;
  if (query.status === "suspended") where.isActive = false;
  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: "insensitive" } },
      { lastName: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search } },
      { position: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const dir = query.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.EmployeeOrderByWithRelationInput =
    query.sortBy === "name"
      ? { firstName: dir }
      : query.sortBy === "position" || query.sortBy === "hireDate" || query.sortBy === "salary"
        ? { [query.sortBy]: dir }
        : { createdAt: "desc" };

  const [rows, total] = await prisma.$transaction([
    prisma.employee.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      include: { _count: { select: { washRecords: true } }, expenses: { select: { id: true } } },
    }),
    prisma.employee.count({ where }),
  ]);

  // Today's wash count per employee.
  const counts = await prisma.washRecord.groupBy({
    by: ["employeeId"],
    where: { employeeId: { in: rows.map((r) => r.id) }, ...todayCountWhere() },
    _count: { _all: true },
  });
  const todayByEmployee = new Map(counts.map((c) => [c.employeeId, c._count._all]));

  const data = rows.map((r) => ({
    ...serialize(r),
    washesToday: todayByEmployee.get(r.id) ?? 0,
  }));
  return { data, ...buildPageMeta(total, pagination) };
}

export async function getEmployee(id: string) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { _count: { select: { washRecords: true } }, expenses: { select: { id: true } } },
  });
  if (!employee) throw ApiError.notFound("Employee not found");
  const today = await prisma.washRecord.count({ where: { employeeId: id, ...todayCountWhere() } });
  return { ...serialize(employee), washesToday: today };
}

/** Performance dashboard numbers for a single employee. */
export async function getEmployeeStats(id: string) {
  const employee = await prisma.employee.findUnique({ where: { id }, select: { id: true } });
  if (!employee) throw ApiError.notFound("Employee not found");

  const now = new Date();
  const today = startOfDay(now);
  const week = startOfWeek(now);
  const month = startOfMonth(now);

  const [carsToday, carsWeek, carsMonth, revenueResult, attendance] = await Promise.all([
    prisma.washRecord.count({ where: { employeeId: id, createdAt: { gte: today } } }),
    prisma.washRecord.count({ where: { employeeId: id, createdAt: { gte: week } } }),
    prisma.washRecord.count({ where: { employeeId: id, createdAt: { gte: month } } }),
    prisma.washRecord.aggregate({
      where: { employeeId: id, status: "COMPLETED", completedAt: { gte: month } },
      _sum: { total: true },
    }),
    prisma.washRecord.groupBy({
      by: ["status"],
      where: { employeeId: id },
      _count: { _all: true },
    }),
  ]);

  const completed = attendance.find((a) => a.status === "COMPLETED")?._count._all ?? 0;
  const cancelled = attendance.find((a) => a.status === "CANCELLED")?._count._all ?? 0;
  const totalJobs = attendance.reduce((sum, a) => sum + a._count._all, 0);
  // Pseudo rating for the scaffold — real reviews arrive with the Bookings module.
  const avgRating = completed === 0 ? 0 : Number((4.2 + Math.min(completed, 20) * 0.04).toFixed(1));

  return {
    carsWashedToday: carsToday,
    carsWashedWeek: carsWeek,
    carsWashedMonth: carsMonth,
    revenueGenerated: Number(revenueResult._sum.total ?? 0),
    avgRating,
    attendance: {
      completed,
      cancelled,
      total: totalJobs,
      completionRate: totalJobs > 0 ? Math.round((completed / totalJobs) * 100) : 0,
    },
  };
}

export async function createEmployee(input: EmployeeInput, branchId: string | null) {
  const employee = await prisma.employee.create({
    data: {
      firstName: input.firstName!,
      lastName: input.lastName!,
      phone: input.phone!,
      email: input.email || null,
      avatarUrl: input.avatarUrl || null,
      nrcNumber: input.nrcNumber || null,
      position: input.position!,
      hireDate: input.hireDate ?? new Date(),
      salary: input.salary ?? null,
      emergencyContact: input.emergencyContact
        ? (input.emergencyContact as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      notes: input.notes || null,
      payday: input.payday ?? null,
      employmentType: input.employmentType,
      payrollEnabled: input.payrollEnabled,
      attendanceRequired: input.attendanceRequired,
      overtimeEligible: input.overtimeEligible,
      branchId,
    },
  });
  return getEmployee(employee.id);
}

export async function updateEmployee(id: string, input: EmployeeInput) {
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Employee not found");
  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl || null }),
      ...(input.nrcNumber !== undefined && { nrcNumber: input.nrcNumber || null }),
      ...(input.position !== undefined && { position: input.position }),
      ...(input.hireDate !== undefined && { hireDate: input.hireDate }),
      ...(input.salary !== undefined && { salary: input.salary }),
      ...(input.emergencyContact !== undefined && {
        emergencyContact: input.emergencyContact
          ? (input.emergencyContact as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
      ...(input.payday !== undefined && { payday: input.payday }),
      ...(input.employmentType !== undefined && { employmentType: input.employmentType }),
      ...(input.payrollEnabled !== undefined && { payrollEnabled: input.payrollEnabled }),
      ...(input.attendanceRequired !== undefined && { attendanceRequired: input.attendanceRequired }),
      ...(input.overtimeEligible !== undefined && { overtimeEligible: input.overtimeEligible }),
    },
  });
  return getEmployee(employee.id);
}

export async function suspendEmployee(id: string, isActive: boolean) {
  const employee = await prisma.employee
    .update({ where: { id }, data: { isActive } })
    .catch(() => {
      throw ApiError.notFound("Employee not found");
    });
  return getEmployee(employee.id);
}

export async function deleteEmployee(id: string): Promise<void> {
  await prisma.employee
    .delete({ where: { id } })
    .catch(() => {
      throw ApiError.notFound("Employee not found");
    });
}

// ---------------------------------------------------------------------
// Payroll — salary payments
// ---------------------------------------------------------------------

const monthLabel = (ym: string): string => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, 1).toLocaleDateString("en-ZM", {
    month: "long",
    year: "numeric",
  });
};

/** Last `count` months as "YYYY-MM", current month first. */
const lastMonths = (count: number): string[] => {
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
};

export interface SalaryPaymentInput {
  month: string;
  amount?: number;
  paymentDate?: Date;
  method?: PaymentMethod;
  notes?: string;
}

/** Per-month paid/unpaid history for the last six months. */
export async function getSalaryHistory(id: string) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw ApiError.notFound("Employee not found");

  const payments = await prisma.salaryPayment.findMany({
    where: { employeeId: id },
    orderBy: { month: "desc" },
  });
  const byMonth = new Map(payments.map((p) => [p.month, p]));

  const months = lastMonths(6).map((m) => {
    const p = byMonth.get(m);
    return {
      month: m,
      label: monthLabel(m),
      salaryAmount: employee.salary ? Number(employee.salary) : null,
      paid: Boolean(p),
      amount: p ? Number(p.amount) : null,
      paymentDate: p ? p.paymentDate.toISOString() : null,
      method: p ? p.method : null,
    };
  });
  return { months };
}

export async function recordSalaryPayment(
  id: string,
  input: SalaryPaymentInput,
  createdById: string | undefined,
  branchId: string | null,
) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw ApiError.notFound("Employee not found");

  const amount = input.amount ?? (employee.salary ? Number(employee.salary) : null);
  if (amount == null || amount < 0) {
    throw ApiError.badRequest("No salary set for this employee — provide an amount");
  }

  const existing = await prisma.salaryPayment.findUnique({
    where: { employeeId_month: { employeeId: id, month: input.month } },
  });
  if (existing) throw ApiError.conflict(`Salary already paid for ${monthLabel(input.month)}`);

  const payment = await prisma.salaryPayment.create({
    data: {
      employeeId: id,
      month: input.month,
      amount: new Prisma.Decimal(amount),
      paymentDate: input.paymentDate ?? new Date(),
      method: input.method ?? "CASH",
      notes: input.notes || null,
      createdById,
      branchId,
    },
  });

  return {
    month: payment.month,
    label: monthLabel(payment.month),
    salaryAmount: employee.salary ? Number(employee.salary) : null,
    paid: true,
    amount: Number(payment.amount),
    paymentDate: payment.paymentDate.toISOString(),
    method: payment.method,
  };
}

// ---------------------------------------------------------------------
// Time clock — clock in/out & shift history
// ---------------------------------------------------------------------

interface TimeEntryRow {
  id: string;
  clockInAt: Date;
  clockOutAt: Date | null;
  hoursWorked: Prisma.Decimal | null;
  notes: string | null;
}

function serializeTimeEntry(e: TimeEntryRow) {
  return {
    id: e.id,
    clockInAt: e.clockInAt.toISOString(),
    clockOutAt: e.clockOutAt ? e.clockOutAt.toISOString() : null,
    hoursWorked: e.hoursWorked ? Number(e.hoursWorked) : null,
    notes: e.notes,
  };
}

export async function getTimeEntries(id: string) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw ApiError.notFound("Employee not found");

  const current = await prisma.timeEntry.findFirst({
    where: { employeeId: id, clockOutAt: null },
    orderBy: { clockInAt: "desc" },
  });
  const entries = await prisma.timeEntry.findMany({
    where: { employeeId: id },
    orderBy: { clockInAt: "desc" },
    take: 20,
  });

  return {
    current: current ? serializeTimeEntry(current) : null,
    entries: entries.map(serializeTimeEntry),
  };
}

export async function clockIn(id: string, branchId: string | null) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw ApiError.notFound("Employee not found");

  const open = await prisma.timeEntry.findFirst({ where: { employeeId: id, clockOutAt: null } });
  if (open) throw ApiError.conflict("Employee is already clocked in");

  const entry = await prisma.timeEntry.create({
    data: { employeeId: id, clockInAt: new Date(), branchId },
  });
  await attendanceService.markAttendance({
    employeeId: id,
    branchId,
    source: "CLOCK_BUTTON",
    timeEntryId: entry.id,
  });
  return serializeTimeEntry(entry);
}

export async function clockOut(id: string, notes?: string) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw ApiError.notFound("Employee not found");

  const open = await prisma.timeEntry.findFirst({
    where: { employeeId: id, clockOutAt: null },
    orderBy: { clockInAt: "desc" },
  });
  if (!open) throw ApiError.badRequest("Employee is not clocked in");

  const clockOutAt = new Date();
  const hours = Math.max(0, (clockOutAt.getTime() - open.clockInAt.getTime()) / 3_600_000);

  const entry = await prisma.timeEntry.update({
    where: { id: open.id },
    data: {
      clockOutAt,
      hoursWorked: new Prisma.Decimal(Number(hours.toFixed(2))),
      notes: notes || open.notes,
    },
  });
  await attendanceService.finalizeAttendance({
    employeeId: id,
    branchId: open.branchId ?? null,
    timeEntryId: open.id,
    clockOutAt,
  });
  return serializeTimeEntry(entry);
}
