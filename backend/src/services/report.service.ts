import { prisma } from "../config/database.js";

/* ------------------------------------------------------------------ */
/* Report generation — all reports derive from live operational data.  */
/* ------------------------------------------------------------------ */

export type ReportType =
  | "REVENUE"
  | "CUSTOMERS"
  | "VEHICLES"
  | "EMPLOYEES"
  | "INVENTORY"
  | "EXPENSES"
  | "SERVICES"
  | "WASH_JOBS"
  | "RECEIPTS";

export type PeriodKey = "today" | "yesterday" | "week" | "month" | "year" | "custom";

export interface ReportQuery {
  type: ReportType;
  period: PeriodKey;
  from?: string;
  to?: string;
  branchId?: string | null;
}

export interface ReportResult {
  type: ReportType;
  periodLabel: string;
  summary: { label: string; value: number; kind: "currency" | "number" | "percent" }[];
  series: { label: string; value: number; secondary?: number }[];
  table: Record<string, string | number | null>[];
}

/* ----------------------------- Period math ------------------------- */

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function resolvePeriod(query: ReportQuery): { from: Date; to: Date; label: string } {
  const now = new Date();
  const today = startOfDay(now);
  let from: Date;
  let to = new Date(now);
  let label: string;

  switch (query.period) {
    case "today":
      from = today;
      label = "Today";
      break;
    case "yesterday": {
      from = new Date(today.getTime() - 24 * 3600_000);
      to = new Date(today.getTime());
      label = "Yesterday";
      break;
    }
    case "week": {
      const day = today.getDay();
      from = new Date(today.getTime() - (day === 0 ? 6 : day - 1) * 24 * 3600_000);
      label = "This week";
      break;
    }
    case "month":
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      label = "This month";
      break;
    case "year":
      from = new Date(today.getFullYear(), 0, 1);
      label = "This year";
      break;
    case "custom":
    default:
      from = query.from ? new Date(query.from) : new Date(today.getTime() - 29 * 24 * 3600_000);
      to = query.to ? new Date(new Date(query.to).getTime() + 24 * 3600_000 - 1) : new Date(now);
      label = "Custom range";
      break;
  }

  if (from.getTime() > to.getTime()) {
    const tmp = from;
    from = to;
    to = tmp;
  }
  const fmt = new Intl.DateTimeFormat("en-ZM", { day: "numeric", month: "short" });
  return { from, to, label: `${label} · ${fmt.format(from)} – ${fmt.format(to)}` };
}

interface Bucket {
  start: Date;
  end: Date;
  label: string;
}

/** Adaptive buckets: daily (≤31d), weekly (≤180d), monthly otherwise. */
function buildBuckets(from: Date, to: Date): Bucket[] {
  const days = Math.ceil((to.getTime() - from.getTime()) / (24 * 3600_000)) + 1;
  const stepMs = 24 * 3600_000;
  const dayFmt = new Intl.DateTimeFormat("en-ZM", { day: "numeric", month: "short" });

  if (days <= 31) {
    const buckets: Bucket[] = [];
    for (let i = 0; i < days; i++) {
      const start = new Date(from.getTime() + i * stepMs);
      buckets.push({ start, end: new Date(start.getTime() + stepMs), label: dayFmt.format(start) });
    }
    return buckets;
  }
  if (days <= 180) {
    const buckets: Bucket[] = [];
    for (let i = 0; i < days; i += 7) {
      const start = new Date(from.getTime() + i * stepMs);
      buckets.push({ start, end: new Date(Math.min(start.getTime() + 7 * stepMs, to.getTime() + stepMs)), label: dayFmt.format(start) });
    }
    return buckets;
  }
  const buckets: Bucket[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const monthFmt = new Intl.DateTimeFormat("en-ZM", { month: "short", year: "2-digit" });
  while (cursor.getTime() <= to.getTime()) {
    const start = new Date(cursor);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    buckets.push({ start, end, label: monthFmt.format(start) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

/* ------------------------------ Helpers ---------------------------- */

async function completedJobs(from: Date, to: Date, branchId: string | null) {
  return prisma.washRecord.findMany({
    where: {
      status: "COMPLETED",
      branchId,
      OR: [{ completedAt: { gte: from, lt: to } }, { completedAt: null, createdAt: { gte: from, lt: to } }],
    },
    include: { customer: true, vehicle: true, service: true, employee: true },
  });
}

const round = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------- Types ----------------------------- */

async function revenueReport(from: Date, to: Date, branchId: string | null): Promise<ReportParts> {
  const jobs = await completedJobs(from, to, branchId);
  const total = jobs.reduce((s, j) => s + Number(j.total), 0);
  const newCustomers = await prisma.customer.count({ where: { branchId, createdAt: { gte: from, lt: to } } });

  const buckets = buildBuckets(from, to);
  const series = buckets.map((b) => {
    const dayJobs = jobs.filter((j) => {
      const t = (j.completedAt ?? j.createdAt).getTime();
      return t >= b.start.getTime() && t < b.end.getTime();
    });
    return {
      label: b.label,
      value: round(dayJobs.reduce((s, j) => s + Number(j.total), 0)),
      secondary: dayJobs.length,
    };
  });

  const table = series.map((s) => ({
    date: s.label,
    washes: s.secondary ?? 0,
    revenue: round(s.value),
    avgTicket: (s.secondary ?? 0) > 0 ? round(s.value / (s.secondary ?? 1)) : 0,
  }));

  const summary = [
    { label: "Revenue", value: round(total), kind: "currency" as const },
    { label: "Completed washes", value: jobs.length, kind: "number" as const },
    { label: "Average ticket", value: jobs.length > 0 ? round(total / jobs.length) : 0, kind: "currency" as const },
    { label: "New customers", value: newCustomers, kind: "number" as const },
  ];
  return { summary, series, table };
}

async function customersReport(from: Date, to: Date, branchId: string | null): Promise<ReportParts> {
  const [total, newInPeriod, active, vip] = await Promise.all([
    prisma.customer.count({ where: { branchId } }),
    prisma.customer.count({ where: { branchId, createdAt: { gte: from, lt: to } } }),
    prisma.customer.count({ where: { branchId, status: "ACTIVE" } }),
    prisma.customer.count({ where: { branchId, status: "VIP" } }),
  ]);

  const jobs = await completedJobs(from, to, branchId);
  const byCustomer = new Map<string, { name: string; visits: number; total: number; last: Date }>();
  for (const j of jobs) {
    const key = j.customerId;
    const existing = byCustomer.get(key);
    const when = j.completedAt ?? j.createdAt;
    if (existing) {
      existing.visits += 1;
      existing.total += Number(j.total);
      if (when.getTime() > existing.last.getTime()) existing.last = when;
    } else {
      byCustomer.set(key, { name: `${j.customer.firstName} ${j.customer.lastName}`, visits: 1, total: Number(j.total), last: when });
    }
  }
  const top = [...byCustomer.values()].sort((a, b) => b.total - a.total).slice(0, 10);

  const buckets = buildBuckets(from, to);
  const series = buckets.map((b) => ({ label: b.label, value: 0, secondary: 0 }));
  // New customers per bucket
  const newRows = await prisma.customer.findMany({
    where: { branchId, createdAt: { gte: from, lt: to } },
    select: { createdAt: true },
  });
  newRows.forEach((c) => {
    const t = c.createdAt.getTime();
    const bucket = buckets.find((b) => t >= b.start.getTime() && t < b.end.getTime());
    if (bucket) {
      const idx = buckets.indexOf(bucket);
      series[idx].value += 1;
    }
  });

  const table = top.map((c) => ({
    customer: c.name,
    visits: c.visits,
    total: round(c.total),
    lastVisit: c.last.toISOString(),
  }));

  return {
    summary: [
      { label: "Total customers", value: total, kind: "number" as const },
      { label: "New this period", value: newInPeriod, kind: "number" as const },
      { label: "Active", value: active, kind: "number" as const },
      { label: "VIP", value: vip, kind: "number" as const },
    ],
    series: series.filter((s) => s.value > 0 || series.length <= 31),
    table,
  };
}

async function vehiclesReport(from: Date, to: Date, branchId: string | null): Promise<ReportParts> {
  const [total, washedInPeriod, jobs] = await Promise.all([
    prisma.vehicle.count({ where: { branchId } }),
    prisma.washRecord.groupBy({
      by: ["vehicleId"],
      where: { branchId, createdAt: { gte: from, lt: to } },
      _count: { _all: true },
    }),
    completedJobs(from, to, branchId),
  ]);

  const byVehicle = new Map<string, { plate: string; make: string; model: string; washes: number; last: Date }>();
  for (const j of jobs) {
    const key = j.vehicleId;
    const existing = byVehicle.get(key);
    const when = j.completedAt ?? j.createdAt;
    if (existing) {
      existing.washes += 1;
      if (when.getTime() > existing.last.getTime()) existing.last = when;
    } else {
      byVehicle.set(key, {
        plate: j.vehicle.plateNumber,
        make: j.vehicle.make,
        model: j.vehicle.model,
        washes: 1,
        last: when,
      });
    }
  }
  const top = [...byVehicle.values()].sort((a, b) => b.washes - a.washes).slice(0, 10);

  const buckets = buildBuckets(from, to);
  const series = buckets.map((b) => {
    const count = jobs.filter((j) => {
      const t = (j.completedAt ?? j.createdAt).getTime();
      return t >= b.start.getTime() && t < b.end.getTime();
    }).length;
    return { label: b.label, value: count };
  });

  return {
    summary: [
      { label: "Total vehicles", value: total, kind: "number" as const },
      { label: "Vehicles washed", value: washedInPeriod.length, kind: "number" as const },
      { label: "Avg washes / vehicle", value: total > 0 ? round(jobs.length / total) : 0, kind: "number" as const },
      { label: "Washes in period", value: jobs.length, kind: "number" as const },
    ],
    series,
    table: top.map((v) => ({
      plateNumber: v.plate,
      vehicle: `${v.make} ${v.model}`,
      washes: v.washes,
      lastWash: v.last.toISOString(),
    })),
  };
}

async function employeesReport(from: Date, to: Date, branchId: string | null): Promise<ReportParts> {
  const jobs = await completedJobs(from, to, branchId);
  const [activeCount] = await Promise.all([prisma.employee.count({ where: { branchId, isActive: true } })]);

  const byEmployee = new Map<string, { name: string; washes: number; revenue: number; completed: number; cancelled: number }>();
  const allJobs = await prisma.washRecord.findMany({
    where: { branchId, createdAt: { gte: from, lt: to }, employeeId: { not: null } },
    include: { employee: true },
  });
  for (const j of allJobs) {
    const key = j.employeeId!;
    const existing = byEmployee.get(key);
    const name = j.employee ? `${j.employee.firstName} ${j.employee.lastName}` : "Unassigned";
    if (existing) {
      if (j.status === "COMPLETED") existing.completed += 1;
      if (j.status === "CANCELLED") existing.cancelled += 1;
      existing.washes += 1;
      if (j.status === "COMPLETED") existing.revenue += Number(j.total);
    } else {
      byEmployee.set(key, {
        name,
        washes: 1,
        revenue: j.status === "COMPLETED" ? Number(j.total) : 0,
        completed: j.status === "COMPLETED" ? 1 : 0,
        cancelled: j.status === "CANCELLED" ? 1 : 0,
      });
    }
  }
  const list = [...byEmployee.values()].sort((a, b) => b.washes - a.washes);

  return {
    summary: [
      { label: "Active employees", value: activeCount, kind: "number" as const },
      { label: "Jobs in period", value: jobs.length, kind: "number" as const },
      { label: "Revenue in period", value: round(jobs.reduce((s, j) => s + Number(j.total), 0)), kind: "currency" as const },
      { label: "Avg jobs / employee", value: list.length > 0 ? round(allJobs.length / list.length) : 0, kind: "number" as const },
    ],
    series: list.map((e) => ({ label: e.name, value: e.washes, secondary: e.revenue })),
    table: list.map((e) => ({
      employee: e.name,
      washes: e.washes,
      revenue: round(e.revenue),
      completed: e.completed,
      cancelled: e.cancelled,
    })),
  };
}

async function inventoryReport(from: Date, to: Date, branchId: string | null): Promise<ReportParts> {
  const items = await prisma.inventoryItem.findMany({ where: branchId ? { branchId } : {} });
  const movements = await prisma.inventoryMovement.findMany({
    where: { branchId, createdAt: { gte: from, lt: to } },
    include: { item: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const totalValue = items.reduce((s, i) => s + Number(i.quantityAvailable) * Number(i.costPrice), 0);
  const lowStock = items.filter((i) => Number(i.quantityAvailable) <= Number(i.reorderLevel));

  // Consumption by item (ISSUE / WRITE_OFF)
  const consumption = new Map<string, { name: string; qty: number }>();
  for (const m of movements) {
    if (m.type !== "ISSUE" && m.type !== "WRITE_OFF") continue;
    const existing = consumption.get(m.itemId);
    if (existing) existing.qty += Number(m.quantity);
    else consumption.set(m.itemId, { name: m.item.name, qty: Number(m.quantity) });
  }

  return {
    summary: [
      { label: "Inventory value", value: round(totalValue), kind: "currency" as const },
      { label: "Low / out of stock", value: lowStock.length, kind: "number" as const },
      { label: "Movements", value: movements.length, kind: "number" as const },
      { label: "Items", value: items.length, kind: "number" as const },
    ],
    series: [...consumption.values()].sort((a, b) => b.qty - a.qty).slice(0, 8).map((c) => ({ label: c.name, value: round(c.qty) })),
    table: movements.slice(0, 50).map((m) => ({
      date: m.createdAt.toISOString(),
      item: m.item.name,
      type: m.type,
      quantity: Number(m.quantity),
      balance: Number(m.balanceAfter),
      reason: m.reason ?? "",
    })),
  };
}

async function expensesReport(from: Date, to: Date, branchId: string | null): Promise<ReportParts> {
  const expenses = await prisma.expense.findMany({
    where: { branchId, expenseDate: { gte: from, lt: to } },
    orderBy: { expenseDate: "desc" },
    take: 200,
  });
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
  }
  const pending = expenses.filter((e) => e.status === "PENDING").length;
  const largest = expenses.length > 0 ? Math.max(...expenses.map((e) => Number(e.amount))) : 0;

  return {
    summary: [
      { label: "Total expenses", value: round(total), kind: "currency" as const },
      { label: "Expense entries", value: expenses.length, kind: "number" as const },
      { label: "Pending approval", value: pending, kind: "number" as const },
      { label: "Largest expense", value: round(largest), kind: "currency" as const },
    ],
    series: [...byCategory.entries()].map(([category, amount]) => ({ label: category, value: round(amount) })),
    table: expenses.map((e) => ({
      date: e.expenseDate.toISOString(),
      category: e.category,
      vendor: e.vendor ?? "",
      amount: Number(e.amount),
      status: e.status,
    })),
  };
}

async function servicesReport(from: Date, to: Date, branchId: string | null): Promise<ReportParts> {
  const jobs = await completedJobs(from, to, branchId);
  const [totalServices, activeServices] = await Promise.all([
    prisma.service.count({ where: { branchId } }),
    prisma.service.count({ where: { branchId, isActive: true } }),
  ]);

  const byService = new Map<string, { name: string; count: number; revenue: number }>();
  for (const j of jobs) {
    const existing = byService.get(j.serviceId);
    if (existing) {
      existing.count += 1;
      existing.revenue += Number(j.total);
    } else {
      byService.set(j.serviceId, { name: j.service.name, count: 1, revenue: Number(j.total) });
    }
  }
  const list = [...byService.values()].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = list.reduce((s, x) => s + x.revenue, 0);

  return {
    summary: [
      { label: "Total services", value: totalServices, kind: "number" as const },
      { label: "Active services", value: activeServices, kind: "number" as const },
      { label: "Washes completed", value: jobs.length, kind: "number" as const },
      { label: "Revenue by service", value: round(totalRevenue), kind: "currency" as const },
    ],
    series: list.slice(0, 8).map((s) => ({ label: s.name, value: round(s.revenue), secondary: s.count })),
    table: list.map((s) => ({
      service: s.name,
      washes: s.count,
      revenue: round(s.revenue),
      avgTicket: s.count > 0 ? round(s.revenue / s.count) : 0,
    })),
  };
}

async function washJobsReport(from: Date, to: Date, branchId: string | null): Promise<ReportParts> {
  const jobs = await prisma.washRecord.findMany({ where: { branchId, createdAt: { gte: from, lt: to } } });
  const completed = jobs.filter((j) => j.status === "COMPLETED");
  const cancelled = jobs.filter((j) => j.status === "CANCELLED");
  const revenue = completed.reduce((s, j) => s + Number(j.total), 0);

  const buckets = buildBuckets(from, to);
  const series = buckets.map((b) => {
    const bucketJobs = jobs.filter((j) => {
      const t = j.createdAt.getTime();
      return t >= b.start.getTime() && t < b.end.getTime();
    });
    return {
      label: b.label,
      value: bucketJobs.length,
      secondary: bucketJobs.filter((j) => j.status === "COMPLETED").length,
    };
  });

  const statusBreakdown = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((status) => ({
    status,
    count: jobs.filter((j) => j.status === status).length,
  }));

  return {
    summary: [
      { label: "Total jobs", value: jobs.length, kind: "number" as const },
      { label: "Completed", value: completed.length, kind: "number" as const },
      { label: "Cancelled", value: cancelled.length, kind: "number" as const },
      { label: "Completion rate", value: jobs.length > 0 ? Math.round((completed.length / jobs.length) * 100) : 0, kind: "percent" as const },
    ],
    series,
    table: statusBreakdown.map((s) => ({ ...s, revenue: round(revenue * (s.count / Math.max(1, jobs.length))) })),
  };
}

async function receiptsReport(from: Date, to: Date, branchId: string | null): Promise<ReportParts> {
  const receipts = await prisma.receipt.findMany({
    where: { branchId, createdAt: { gte: from, lt: to } },
    include: { washRecord: { include: { customer: { select: { firstName: true, lastName: true } }, vehicle: { select: { plateNumber: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const total = receipts.reduce((s, r) => s + Number(r.total), 0);
  const voided = receipts.filter((r) => r.status === "VOIDED").length;

  const buckets = buildBuckets(from, to);
  const series = buckets.map((b) => {
    const count = receipts.filter((r) => {
      const t = r.createdAt.getTime();
      return t >= b.start.getTime() && t < b.end.getTime();
    }).length;
    return { label: b.label, value: count };
  });

  return {
    summary: [
      { label: "Receipts issued", value: receipts.length, kind: "number" as const },
      { label: "Total value", value: round(total), kind: "currency" as const },
      { label: "Voided", value: voided, kind: "number" as const },
      { label: "Average receipt", value: receipts.length > 0 ? round(total / receipts.length) : 0, kind: "currency" as const },
    ],
    series,
    table: receipts.slice(0, 50).map((r) => ({
      receiptNo: r.receiptNo,
      customer: `${r.washRecord.customer.firstName} ${r.washRecord.customer.lastName}`,
      plateNumber: r.washRecord.vehicle.plateNumber,
      total: Number(r.total),
      status: r.status,
      date: r.createdAt.toISOString(),
    })),
  };
}

/* ------------------------------ Dispatch --------------------------- */

type ReportParts = Pick<ReportResult, "summary" | "series" | "table">;

const builders: Record<ReportType, (from: Date, to: Date, branchId: string | null) => Promise<ReportParts>> = {
  REVENUE: revenueReport,
  CUSTOMERS: customersReport,
  VEHICLES: vehiclesReport,
  EMPLOYEES: employeesReport,
  INVENTORY: inventoryReport,
  EXPENSES: expensesReport,
  SERVICES: servicesReport,
  WASH_JOBS: washJobsReport,
  RECEIPTS: receiptsReport,
};

export async function generateReport(query: ReportQuery): Promise<ReportResult> {
  const { from, to, label } = resolvePeriod(query);
  const parts = await builders[query.type](from, to, query.branchId ?? null);
  return {
    type: query.type,
    periodLabel: label,
    summary: parts.summary,
    series: parts.series,
    table: parts.table,
  };
}

/** CSV export of the current report's table. */
export function reportToCsv(result: ReportResult): string {
  if (result.table.length === 0) return "No data";
  const headers = Object.keys(result.table[0]);
  const escape = (v: string | number | null) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(escape).join(","), ...result.table.map((row) => headers.map((h) => escape(row[h] ?? "")).join(","))].join("\r\n");
}
