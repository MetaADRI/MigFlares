import type { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { getTodaySummary } from "./attendance.service.js";
import { getPendingLeaveCount } from "./leave.service.js";
import { paydayReminders } from "./payroll.service.js";

function rangeFilter(from: Date, to?: Date): Prisma.WashRecordWhereInput {
  const field = "completedAt" as const;
  return to
    ? { [field]: { gte: from, lt: to } }
    : { [field]: { gte: from } };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600_000);

async function revenueIn(from: Date, to: Date | undefined, branchId: string | null): Promise<number> {
  const result = await prisma.washRecord.aggregate({
    where: {
      status: "COMPLETED",
      branchId,
      ...rangeFilter(from, to),
    },
    _sum: { total: true },
  });
  return Number(result._sum.total ?? 0);
}

function pct(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getStats(branchId: string | null) {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = startOfDay(daysAgo(1));
  const week = startOfWeek(now);
  const prevWeek = startOfWeek(daysAgo(7));
  const month = startOfMonth(now);
  const prevMonth = startOfMonth(daysAgo(30));

  const [todayRevenue, yesterdayRevenue, weeklyRevenue, prevWeekRevenue, monthlyRevenue, prevMonthRevenue] =
    await Promise.all([
      revenueIn(today, undefined, branchId),
      revenueIn(yesterday, today, branchId),
      revenueIn(week, undefined, branchId),
      revenueIn(prevWeek, week, branchId),
      revenueIn(month, undefined, branchId),
      revenueIn(prevMonth, month, branchId),
    ]);

  const [todayJobs, pending, inProgress, completed, employees, monthCount] = await Promise.all([
    prisma.washRecord.count({ where: { createdAt: { gte: today }, branchId } }),
    prisma.washRecord.count({ where: { status: "PENDING", branchId } }),
    prisma.washRecord.count({ where: { status: "IN_PROGRESS", branchId } }),
    prisma.washRecord.count({ where: { status: "COMPLETED", branchId } }),
    prisma.employee.count({ where: { isActive: true, branchId } }),
    prisma.washRecord.count({ where: { status: "COMPLETED", branchId, completedAt: { gte: month } } }),
  ]);

  return {
    todayRevenue,
    todayRevenueTrend: pct(todayRevenue, yesterdayRevenue),
    weeklyRevenue,
    weeklyRevenueTrend: pct(weeklyRevenue, prevWeekRevenue),
    monthlyRevenue,
    monthlyRevenueTrend: pct(monthlyRevenue, prevMonthRevenue),
    todayCars: todayJobs,
    pendingWashes: pending,
    inProgressWashes: inProgress,
    completedWashes: completed,
    employeesPresent: employees,
    avgTicket: monthCount > 0 ? Math.round(monthlyRevenue / monthCount) : 0,
  };
}

export async function getRevenueSeries(period: "week" | "month", branchId: string | null) {
  const days = period === "week" ? 7 : 30;
  const points = [];
  for (let i = days - 1; i >= 0; i--) {
    const from = startOfDay(daysAgo(i));
    const to = startOfDay(daysAgo(i - 1));
    const dayJobs = await prisma.washRecord.findMany({
      where: { status: "COMPLETED", branchId, completedAt: { gte: from, lt: to } },
      select: { total: true },
    });
    points.push({
      label: from.toLocaleDateString("en-ZM", period === "week" ? { weekday: "short" } : { day: "numeric", month: "short" }),
      revenue: dayJobs.reduce((sum, j) => sum + Number(j.total), 0),
      cars: dayJobs.length,
    });
  }
  return points;
}

export async function getActivities(branchId: string | null) {
  const jobs = await prisma.washRecord.findMany({
    where: { branchId },
    orderBy: { createdAt: "desc" },
    take: 9,
    include: { customer: true, vehicle: true, service: { select: { name: true } } },
  });
  return jobs.map((j) => ({
    id: j.id,
    title: `${j.customer.firstName} ${j.customer.lastName} · ${j.service.name}`,
    description:
      j.status === "COMPLETED"
        ? `${j.vehicle.plateNumber} washed — ${j.reference}`
        : j.status === "IN_PROGRESS"
          ? `${j.vehicle.plateNumber} currently in the bay`
          : `${j.vehicle.plateNumber} queued for service`,
    time: j.createdAt.toISOString(),
    type: j.status === "COMPLETED" ? "payment" : "wash",
  }));
}

export async function getTopServices(branchId: string | null) {
  const grouped = await prisma.washRecord.groupBy({
    by: ["serviceId"],
    where: { status: "COMPLETED", branchId },
    _count: { _all: true },
    _sum: { total: true },
  });
  const services = await prisma.service.findMany({
    where: { id: { in: grouped.map((g) => g.serviceId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(services.map((s) => [s.id, s.name]));
  const totalRevenue = grouped.reduce((sum, g) => sum + Number(g._sum.total ?? 0), 0);

  return grouped
    .map((g) => ({
      id: g.serviceId,
      name: nameById.get(g.serviceId) ?? "Unknown",
      count: g._count._all,
      revenue: Number(g._sum.total ?? 0),
      percentage: totalRevenue > 0 ? Math.round((Number(g._sum.total ?? 0) / totalRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

export async function getRecentCustomers(branchId: string | null) {
  const customers = await prisma.customer.findMany({
    where: { branchId },
    orderBy: { lastVisitAt: "desc" },
    take: 5,
    include: { _count: { select: { vehicles: true, washRecords: true } } },
  });
  return customers.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    email: c.email,
    address: c.address,
    notes: c.notes,
    avatarUrl: c.avatarUrl,
    status: c.status,
    vehiclesCount: c._count.vehicles,
    visits: c._count.washRecords,
    totalSpent: 0,
    lastVisitAt: c.lastVisitAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  }));
}

/** Consolidated operational snapshot for the dashboard's lower panels. */
export async function getInsights(branchId: string | null) {
  const whereBranch = branchId ? { branchId } : {};
  const month = startOfMonth(new Date());
  const prevMonth = startOfMonth(daysAgo(30));

  const [inventoryAlerts, expenses, pendingCount, receipts, employeeJobs, services, employees] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { ...whereBranch, OR: [{ quantityAvailable: { lte: prisma.inventoryItem.fields.reorderLevel } }, { quantityAvailable: 0 }] },
      orderBy: { quantityAvailable: "asc" },
      take: 6,
      select: { id: true, name: true, sku: true, quantityAvailable: true, reorderLevel: true, unit: true },
    }),
    prisma.expense.findMany({
      where: { ...whereBranch, expenseDate: { gte: month } },
      select: { amount: true, category: true, vendor: true, expenseDate: true },
    }),
    prisma.expense.count({ where: { ...whereBranch, status: "PENDING" } }),
    prisma.receipt.findMany({
      where: { ...whereBranch, status: { not: "VOIDED" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        washRecord: {
          select: {
            vehicle: { select: { plateNumber: true } },
            customer: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.washRecord.groupBy({
      by: ["employeeId"],
      where: { ...whereBranch, status: "COMPLETED", employeeId: { not: null } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.service.findMany({ where: { ...whereBranch }, select: { id: true, name: true } }),
    prisma.employee.findMany({
      where: { ...whereBranch },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const employeeName = new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]));
  const activeEmployees = employeeJobs
    .map((g) => ({
      id: g.employeeId as string,
      name: employeeName.get(g.employeeId as string) ?? "Unassigned",
      washes: g._count._all,
      revenue: Number(g._sum.total ?? 0),
    }))
    .sort((a, b) => b.washes - a.washes)
    .slice(0, 5);

  const monthlyExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const prevExpenses = await prisma.expense.aggregate({
    where: { ...whereBranch, expenseDate: { gte: prevMonth, lt: month } },
    _sum: { amount: true },
  });
  const prevTotal = Number(prevExpenses._sum.amount ?? 0);
  const largest = expenses.length > 0 ? [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount))[0] : null;

  const serviceDistribution = await Promise.all(
    (await prisma.washRecord.groupBy({
      by: ["serviceId"],
      where: { ...whereBranch, status: "COMPLETED" },
      _count: { _all: true },
      _sum: { total: true },
    }))
      .map(async (g) => ({
        name: services.find((s) => s.id === g.serviceId)?.name ?? "Unknown",
        count: g._count._all,
        revenue: Number(g._sum.total ?? 0),
      }))
      .slice(0, 5),
  );

  return {
    inventoryAlerts: inventoryAlerts.map((i) => ({
      id: i.id,
      name: i.name,
      sku: i.sku,
      quantityAvailable: Number(i.quantityAvailable),
      reorderLevel: Number(i.reorderLevel),
      unit: i.unit,
      outOfStock: Number(i.quantityAvailable) === 0,
    })),
    expenseSummary: {
      monthlyExpenses,
      pendingApprovals: pendingCount,
      monthlyTrend: pct(monthlyExpenses, prevTotal),
      largestExpense: largest
        ? { amount: Number(largest.amount), category: largest.category, vendor: largest.vendor }
        : null,
    },
    latestReceipts: receipts.map((r) => ({
      id: r.id,
      receiptNo: r.receiptNo,
      customerName: r.washRecord
        ? `${r.washRecord.customer.firstName} ${r.washRecord.customer.lastName}`
        : "Walk-in",
      plateNumber: r.washRecord?.vehicle?.plateNumber ?? "",
      total: Number(r.total),
      issuedAt: r.createdAt.toISOString(),
    })),
    serviceDistribution: serviceDistribution.sort((a, b) => b.revenue - a.revenue),
    activeEmployees,
  };
}

/** Staff snapshot for dashboard widgets — attendance today, pending leave, payday. */
export async function getStaffSnapshot(branchId: string | null) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [attendance, pendingLeave, payday, currentRun] = await Promise.all([
    getTodaySummary(branchId),
    getPendingLeaveCount(branchId),
    paydayReminders(branchId),
    prisma.payrollRun.findFirst({
      where: { branchId, periodMonth: monthKey },
      include: { _count: { select: { payslips: true } } },
    }),
  ]);

  return {
    attendance,
    pendingLeave,
    payday,
    currentRun: currentRun
      ? {
          id: currentRun.id,
          periodMonth: currentRun.periodMonth,
          status: currentRun.status,
          payslipCount: currentRun._count.payslips,
          employeeCount: currentRun.employeeCount,
          totalNet: Number(currentRun.totalNet),
        }
      : null,
  };
}
