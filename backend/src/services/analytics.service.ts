import { prisma } from "../config/database.js";

/* ------------------------------------------------------------------ */
/* Executive analytics — KPIs and trends derived from live data.       */
/* ------------------------------------------------------------------ */

const startOfDay = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

const round = (n: number) => Math.round(n * 100) / 100;

export async function getAnalyticsOverview(branchId: string | null) {
  const now = new Date();
  const today = startOfDay(now);
  const monthStart = startOfMonth(now);
  const prevMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);

  const whereBranch = branchId ? { branchId } : {};

  const [monthJobs, prevMonthJobs, allJobs, customers, employees, services, expenses, movements, receipts] =
    await Promise.all([
      prisma.washRecord.findMany({ where: { ...whereBranch, createdAt: { gte: monthStart } } }),
      prisma.washRecord.findMany({ where: { ...whereBranch, createdAt: { gte: prevMonthStart, lt: monthStart } } }),
      prisma.washRecord.findMany({
        where: whereBranch,
        include: {
          service: { select: { name: true } },
          employee: { select: { firstName: true, lastName: true } },
          customer: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.customer.findMany({ where: whereBranch, select: { createdAt: true, status: true, totalSpent: true } }),
      prisma.employee.findMany({ where: { ...whereBranch, isActive: true }, select: { id: true } }),
      prisma.service.findMany({ where: { ...whereBranch, isActive: true }, select: { id: true, name: true } }),
      prisma.expense.findMany({ where: whereBranch, select: { amount: true, expenseDate: true, category: true } }),
      prisma.inventoryMovement.findMany({
        where: whereBranch,
        include: { item: { select: { name: true, costPrice: true } } },
      }),
      prisma.receipt.findMany({ where: whereBranch, select: { createdAt: true, total: true, status: true } }),
    ]);

  const completed = allJobs.filter((j) => j.status === "COMPLETED");
  const completedTotal = completed.reduce((s, j) => s + Number(j.total), 0);

  /* ------------------------------ KPIs ----------------------------- */

  const carsPerDay =
    allJobs.length > 0 ? round(allJobs.length / Math.max(1, Math.ceil((now.getTime() - today.getTime()) / 86_400_000))) : 0;
  const avgTicket = completed.length > 0 ? round(completedTotal / completed.length) : 0;

  const monthRevenue = monthJobs.filter((j) => j.status === "COMPLETED").reduce((s, j) => s + Number(j.total), 0);
  const prevMonthRevenue = prevMonthJobs.filter((j) => j.status === "COMPLETED").reduce((s, j) => s + Number(j.total), 0);
  const monthlyGrowth =
    prevMonthRevenue > 0 ? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100) : (monthRevenue > 0 ? 100 : 0);

  // Average wash time from createdAt → completedAt on completed jobs.
  const timed = completed.filter((j) => j.completedAt && j.createdAt);
  const avgWashTimeMin =
    timed.length > 0
      ? Math.round(timed.reduce((s, j) => s + (j.completedAt!.getTime() - j.createdAt.getTime()), 0) / timed.length / 60_000)
      : 0;

  /* ---------------------------- Growth ----------------------------- */

  const days = 30;
  const daily: { label: string; revenue: number; washes: number; expenses: number; profit: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(today.getTime() - i * 86_400_000);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);
    const dayJobs = allJobs.filter((j) => {
      const t = (j.completedAt ?? j.createdAt).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime() && j.status === "COMPLETED";
    });
    const dayExpenses = expenses.filter((e) => {
      const t = e.expenseDate.getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    });
    const revenue = dayJobs.reduce((s, j) => s + Number(j.total), 0);
    const expenseTotal = dayExpenses.reduce((s, e) => s + Number(e.amount), 0);
    daily.push({
      label: dayStart.toLocaleDateString("en-ZM", { day: "numeric", month: "short" }),
      revenue: round(revenue),
      washes: dayJobs.length,
      expenses: round(expenseTotal),
      profit: round(revenue - expenseTotal),
    });
  }
  const revenueGrowth =
    daily.length >= 15
      ? Math.round(
          ((daily.slice(7).reduce((s, d) => s + d.revenue, 0) - daily.slice(0, 7).reduce((s, d) => s + d.revenue, 0)) /
            Math.max(1, daily.slice(0, 7).reduce((s, d) => s + d.revenue, 0))) *
            100,
        )
      : 0;

  const avgDailyRevenue = daily.reduce((s, d) => s + d.revenue, 0) / Math.max(1, daily.filter((d) => d.revenue > 0).length || 1);

  /* ------------------------ Popular services ------------------------ */

  const byService = new Map<string, { name: string; count: number; revenue: number }>();
  for (const j of completed) {
    const existing = byService.get(j.serviceId);
    if (existing) {
      existing.count += 1;
      existing.revenue += Number(j.total);
    } else {
      byService.set(j.serviceId, { name: j.service.name, count: 1, revenue: Number(j.total) });
    }
  }
  const popularServices = [...byService.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  /* --------------------------- Peak hours --------------------------- */

  const hourCounts = new Array(24).fill(0) as number[];
  for (const j of allJobs) {
    hourCounts[j.createdAt.getHours()] += 1;
  }
  const peakHours = hourCounts.map((count, hour) => ({
    hour: `${String(hour).padStart(2, "0")}:00`,
    value: count,
  }));

  /* --------------------------- Top customers ------------------------ */

  const byCustomer = new Map<string, { name: string; visits: number; total: number }>();
  for (const j of completed) {
    const key = j.customerId;
    const existing = byCustomer.get(key);
    if (existing) {
      existing.visits += 1;
      existing.total += Number(j.total);
    } else {
      byCustomer.set(key, { name: `${j.customer.firstName} ${j.customer.lastName}`, visits: 1, total: Number(j.total) });
    }
  }
  const topCustomers = [...byCustomer.values()].sort((a, b) => b.total - a.total).slice(0, 5);

  /* --------------------------- Retention ---------------------------- */

  const customersAll = customers.length;
  const returning = new Set(allJobs.map((j) => j.customerId)).size;
  const repeatCustomers = [...byCustomer.values()].filter((c) => c.visits > 1).length;
  const retentionRate = customersAll > 0 ? Math.round((repeatCustomers / customersAll) * 100) : 0;

  /* ------------------------ Employee productivity ------------------- */

  const byEmployee = new Map<string, { name: string; washes: number; revenue: number }>();
  for (const j of allJobs) {
    if (!j.employeeId) continue;
    const existing = byEmployee.get(j.employeeId);
    const name = j.employee ? `${j.employee.firstName} ${j.employee.lastName}` : "Unassigned";
    if (existing) {
      existing.washes += 1;
      if (j.status === "COMPLETED") existing.revenue += Number(j.total);
    } else {
      byEmployee.set(j.employeeId, {
        name,
        washes: 1,
        revenue: j.status === "COMPLETED" ? Number(j.total) : 0,
      });
    }
  }
  const employeeProductivity = [...byEmployee.values()]
    .sort((a, b) => b.washes - a.washes)
    .slice(0, 6)
    .map((e) => ({ label: e.name, washes: e.washes, revenue: round(e.revenue) }));

  /* ----------------------- Inventory consumption -------------------- */

  const consumption = new Map<string, number>();
  const restockSpend = new Map<string, number>();
  for (const m of movements) {
    if (m.type === "ISSUE" || m.type === "WRITE_OFF") {
      consumption.set(m.item.name, (consumption.get(m.item.name) ?? 0) + Number(m.quantity));
    }
    if (m.type === "RESTOCK") {
      restockSpend.set(m.item.name, (restockSpend.get(m.item.name) ?? 0) + Number(m.quantity) * Number(m.item.costPrice));
    }
  }
  const inventoryConsumption = [...consumption.entries()]
    .map(([label, value]) => ({ label, value: round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  /* -------------------------- Expense trends ------------------------ */

  const months = 6;
  const expenseTrends: { label: string; value: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const mStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - i, 1);
    const mEnd = new Date(mStart.getFullYear(), mStart.getMonth() + 1, 1);
    const totalExpenses = expenses
      .filter((e) => e.expenseDate.getTime() >= mStart.getTime() && e.expenseDate.getTime() < mEnd.getTime())
      .reduce((s, e) => s + Number(e.amount), 0);
    expenseTrends.push({
      label: mStart.toLocaleDateString("en-ZM", { month: "short" }),
      value: round(totalExpenses),
    });
  }

  /* --------------------------- Monthly profit ----------------------- */

  const monthlyExpenses = expenses
    .filter((e) => e.expenseDate.getTime() >= monthStart.getTime())
    .reduce((s, e) => s + Number(e.amount), 0);
  const monthlyProfit = round(monthRevenue - monthlyExpenses);

  /* --------------------------- Summary stats ------------------------ */

  const receiptsIssued = receipts.length;
  const receiptsVoided = receipts.filter((r) => r.status === "VOIDED").length;
  const activeEmployees = employees.length;
  const activeServices = services.length;

  return {
    kpis: {
      revenueGrowth,
      averageDailyRevenue: round(avgDailyRevenue),
      avgWashTimeMin,
      carsPerDay,
      avgTicket,
      monthlyGrowth,
      monthlyRevenue: round(monthRevenue),
      monthlyProfit,
      monthlyExpenses: round(monthlyExpenses),
      todayRevenue: round(daily.length > 0 ? daily[daily.length - 1].revenue : 0),
      todayWashes: daily.length > 0 ? daily[daily.length - 1].washes : 0,
    },
    daily,
    popularServices,
    peakHours,
    topCustomers,
    retention: {
      totalCustomers: customersAll,
      returningCustomers: returning,
      repeatCustomers,
      retentionRate,
    },
    employeeProductivity,
    inventoryConsumption,
    expenseTrends,
    summary: {
      receiptsIssued,
      receiptsVoided,
      activeEmployees,
      activeServices,
      totalWashes: allJobs.length,
      completedWashes: completed.length,
    },
  };
}
