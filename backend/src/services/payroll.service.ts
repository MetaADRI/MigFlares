import { Prisma, PaymentMethod, PayrollRunStatus } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";
import { createNotification } from "./notification.service.js";

/* ------------------------------------------------------------------ */
/* Payroll — one rule per branch, monthly runs, per-employee payslips. */
/* Net = Base + (Overtime + Bonus + Allowances) − deductions.          */
/* Status lifecycle: DRAFT → PROCESSED (locked) → PAID.                */
/* ------------------------------------------------------------------ */

const round2 = (n: number): number => Math.round(n * 100) / 100;

const monthStart = (key: string): Date => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1);
};

const monthEnd = (key: string): Date => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 1);
};

const monthLabel = (key: string): string =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString("en-ZM", { month: "long", year: "numeric" });

const monthKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/* ------------------------------------------------------------------ */
/* Payroll rule                                                       */
/* ------------------------------------------------------------------ */

export const DEFAULT_PAYROLL_RULE = {
  name: "Default Payroll Rule",
  startTime: "08:00",
  graceMinutes: 15,
  standardMinutesPerDay: 480,
  overtimeRate: 1.5,
  dailyOvertimeThresholdMin: 600,
  defaultPayday: 25,
  bonusEnabled: true,
  overtimeEnabled: true,
  allowancesEnabled: true,
  deductions: { loan: 0, damages: 0, uniform: 150, transport: 0, meals: 250, advances: 0, other: 0 },
  notes: null as string | null,
};

function serializeRule(r: {
  name: string;
  startTime: string;
  graceMinutes: number;
  standardMinutesPerDay: number;
  overtimeRate: Prisma.Decimal;
  dailyOvertimeThresholdMin: number;
  defaultPayday: number;
  bonusEnabled: boolean;
  overtimeEnabled: boolean;
  allowancesEnabled: boolean;
  deductionLoan: Prisma.Decimal;
  deductionDamages: Prisma.Decimal;
  deductionUniform: Prisma.Decimal;
  deductionTransport: Prisma.Decimal;
  deductionMeals: Prisma.Decimal;
  deductionAdvances: Prisma.Decimal;
  deductionOther: Prisma.Decimal;
  notes: string | null;
}) {
  return {
    name: r.name,
    startTime: r.startTime,
    graceMinutes: r.graceMinutes,
    standardMinutesPerDay: r.standardMinutesPerDay,
    overtimeRate: Number(r.overtimeRate),
    dailyOvertimeThresholdMin: r.dailyOvertimeThresholdMin,
    defaultPayday: r.defaultPayday,
    bonusEnabled: r.bonusEnabled,
    overtimeEnabled: r.overtimeEnabled,
    allowancesEnabled: r.allowancesEnabled,
    deductions: {
      loan: Number(r.deductionLoan),
      damages: Number(r.deductionDamages),
      uniform: Number(r.deductionUniform),
      transport: Number(r.deductionTransport),
      meals: Number(r.deductionMeals),
      advances: Number(r.deductionAdvances),
      other: Number(r.deductionOther),
    },
    notes: r.notes,
  };
}

export async function getPayrollRule(branchId: string | null) {
  const rule = await prisma.payrollRule.findFirst({ where: { branchId } });
  return rule ? serializeRule(rule) : DEFAULT_PAYROLL_RULE;
}

export interface RuleInput {
  name?: string;
  startTime?: string;
  graceMinutes?: number;
  standardMinutesPerDay?: number;
  overtimeRate?: number;
  dailyOvertimeThresholdMin?: number;
  defaultPayday?: number;
  bonusEnabled?: boolean;
  overtimeEnabled?: boolean;
  allowancesEnabled?: boolean;
  deductionLoan?: number;
  deductionDamages?: number;
  deductionUniform?: number;
  deductionTransport?: number;
  deductionMeals?: number;
  deductionAdvances?: number;
  deductionOther?: number;
  notes?: string;
}

type RuleScalarData = {
  name?: string;
  startTime?: string;
  graceMinutes?: number;
  standardMinutesPerDay?: number;
  overtimeRate?: Prisma.Decimal;
  dailyOvertimeThresholdMin?: number;
  defaultPayday?: number;
  bonusEnabled?: boolean;
  overtimeEnabled?: boolean;
  allowancesEnabled?: boolean;
  deductionLoan?: Prisma.Decimal;
  deductionDamages?: Prisma.Decimal;
  deductionUniform?: Prisma.Decimal;
  deductionTransport?: Prisma.Decimal;
  deductionMeals?: Prisma.Decimal;
  deductionAdvances?: Prisma.Decimal;
  deductionOther?: Prisma.Decimal;
  notes?: string | null;
};

export async function upsertPayrollRule(
  branchId: string | null,
  input: RuleInput,
  userId?: string,
) {
  const data: RuleScalarData = {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.startTime !== undefined && { startTime: input.startTime }),
    ...(input.graceMinutes !== undefined && { graceMinutes: input.graceMinutes }),
    ...(input.standardMinutesPerDay !== undefined && {
      standardMinutesPerDay: input.standardMinutesPerDay,
    }),
    ...(input.overtimeRate !== undefined && { overtimeRate: new Prisma.Decimal(input.overtimeRate) }),
    ...(input.dailyOvertimeThresholdMin !== undefined && {
      dailyOvertimeThresholdMin: input.dailyOvertimeThresholdMin,
    }),
    ...(input.defaultPayday !== undefined && { defaultPayday: input.defaultPayday }),
    ...(input.bonusEnabled !== undefined && { bonusEnabled: input.bonusEnabled }),
    ...(input.overtimeEnabled !== undefined && { overtimeEnabled: input.overtimeEnabled }),
    ...(input.allowancesEnabled !== undefined && { allowancesEnabled: input.allowancesEnabled }),
    ...(input.deductionLoan !== undefined && { deductionLoan: new Prisma.Decimal(input.deductionLoan) }),
    ...(input.deductionDamages !== undefined && {
      deductionDamages: new Prisma.Decimal(input.deductionDamages),
    }),
    ...(input.deductionUniform !== undefined && {
      deductionUniform: new Prisma.Decimal(input.deductionUniform),
    }),
    ...(input.deductionTransport !== undefined && {
      deductionTransport: new Prisma.Decimal(input.deductionTransport),
    }),
    ...(input.deductionMeals !== undefined && {
      deductionMeals: new Prisma.Decimal(input.deductionMeals),
    }),
    ...(input.deductionAdvances !== undefined && {
      deductionAdvances: new Prisma.Decimal(input.deductionAdvances),
    }),
    ...(input.deductionOther !== undefined && {
      deductionOther: new Prisma.Decimal(input.deductionOther),
    }),
    ...(input.notes !== undefined && { notes: input.notes }),
  };

  const existing = await prisma.payrollRule.findFirst({ where: { branchId } });
  const rule = existing
    ? await prisma.payrollRule.update({
        where: { id: existing.id },
        data: { ...data, ...(userId ? { updatedById: userId } : {}) },
      })
    : await prisma.payrollRule.create({
        data: {
          branchId,
          ...data,
          name: input.name ?? "Default Payroll Rule",
          ...(userId ? { updatedById: userId } : {}),
        },
      });
  return serializeRule(rule);
}

/* ------------------------------------------------------------------ */
/* Runs & payslips                                                     */
/* ------------------------------------------------------------------ */

const employeeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  position: true,
} as const;

type PayslipRow = Prisma.PayslipGetPayload<{
  include: {
    employee: { select: typeof employeeSelect };
    run: { select: { periodMonth: true; status: true } };
  };
}>;

function serializePayslip(p: PayslipRow) {
  return {
    id: p.id,
    runId: p.runId,
    employee: p.employee
      ? {
          id: p.employee.id,
          firstName: p.employee.firstName,
          lastName: p.employee.lastName,
          position: p.employee.position,
        }
      : undefined,
    periodMonth: p.run.periodMonth,
    runStatus: p.run.status,
    baseSalary: Number(p.baseSalary),
    overtimeHours: Number(p.overtimeHours),
    overtimeAmount: Number(p.overtimeAmount),
    bonusAmount: Number(p.bonusAmount),
    allowancesAmount: Number(p.allowancesAmount),
    grossAmount: Number(p.grossAmount),
    deductions: {
      loan: Number(p.deductionLoan),
      damages: Number(p.deductionDamages),
      uniform: Number(p.deductionUniform),
      transport: Number(p.deductionTransport),
      meals: Number(p.deductionMeals),
      advances: Number(p.deductionAdvances),
      other: Number(p.deductionOther),
    },
    totalDeductions: Number(p.totalDeductions),
    netAmount: Number(p.netAmount),
    workedDays: p.workedDays,
    absentDays: p.absentDays,
    leaveDays: p.leaveDays,
    status: p.status,
    paidAt: p.paidAt?.toISOString() ?? null,
    paymentMethod: p.paymentMethod,
    notes: p.notes,
  };
}

interface RunRow {
  id: string;
  periodMonth: string;
  status: PayrollRunStatus;
  totalGross: Prisma.Decimal;
  totalDeductions: Prisma.Decimal;
  totalNet: Prisma.Decimal;
  employeeCount: number;
  ruleSnapshot: Prisma.JsonValue;
  processedAt: Date | null;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
  _count?: { payslips: number };
  payslips?: PayslipRow[];
}

function serializeRun(r: RunRow) {
  return {
    id: r.id,
    periodMonth: r.periodMonth,
    status: r.status,
    totalGross: Number(r.totalGross),
    totalDeductions: Number(r.totalDeductions),
    totalNet: Number(r.totalNet),
    employeeCount: r.employeeCount,
    payslipCount: r._count?.payslips ?? (r.payslips ? r.payslips.length : undefined),
    ruleSnapshot: r.ruleSnapshot,
    processedAt: r.processedAt?.toISOString() ?? null,
    paidAt: r.paidAt?.toISOString() ?? null,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    ...(r.payslips ? { payslips: r.payslips.map(serializePayslip) } : {}),
  };
}

export interface RunQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  periodMonth?: string;
}

export async function listPayrollRuns(query: RunQuery, branchId: string | null) {
  const pagination = getPagination(query.page, query.pageSize);
  const where: Prisma.PayrollRunWhereInput = {};
  if (branchId) where.branchId = branchId;
  if (query.status && query.status !== "ALL") where.status = query.status as PayrollRunStatus;
  if (query.periodMonth) where.periodMonth = query.periodMonth;

  const [rows, total] = await prisma.$transaction([
    prisma.payrollRun.findMany({
      where,
      include: { _count: { select: { payslips: true } } },
      orderBy: { periodMonth: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.payrollRun.count({ where }),
  ]);

  return { data: rows.map(serializeRun), ...buildPageMeta(total, pagination) };
}

export async function getPayrollRun(id: string, branchId?: string | null) {
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      _count: { select: { payslips: true } },
      payslips: {
        include: {
          employee: { select: employeeSelect },
          run: { select: { periodMonth: true, status: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!run) throw ApiError.notFound("Payroll run not found");
  if (branchId && run.branchId !== branchId) throw ApiError.forbidden();
  return serializeRun(run);
}

export async function generateRun(periodKey: string, branchId: string | null, userId?: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodKey)) {
    throw ApiError.badRequest("Month must be in YYYY-MM format");
  }
  const existing = await prisma.payrollRun.findFirst({ where: { branchId, periodMonth: periodKey } });
  if (existing) {
    throw ApiError.conflict(`Payroll for ${monthLabel(periodKey)} already exists`);
  }

  const rule = await prisma.payrollRule.findFirst({ where: { branchId } });
  const employees = await prisma.employee.findMany({
    where: { branchId, isActive: true, payrollEnabled: true, salary: { gt: 0 } },
    orderBy: { lastName: "asc" },
  });

  const start = monthStart(periodKey);
  const end = monthEnd(periodKey);
  const records = await prisma.attendanceRecord.findMany({
    where: { branchId, date: { gte: start, lt: end } },
  });
  const byEmployee = new Map<string, typeof records>();
  for (const r of records) {
    const list = byEmployee.get(r.employeeId) ?? [];
    list.push(r);
    byEmployee.set(r.employeeId, list);
  }

  const slips: Omit<Prisma.PayslipCreateManyInput, "runId">[] = [];
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  for (const emp of employees) {
    const att = byEmployee.get(emp.id) ?? [];
    const workedDays = att.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE",
    ).length;
    const absentDays = att.filter((a) => a.status === "ABSENT").length;
    const leaveDays = att.filter((a) => a.status === "ON_LEAVE").length;
    const overtimeHours = round2(att.reduce((sum, a) => sum + Number(a.overtimeHours ?? 0), 0));

    const hourly = Number(emp.salary) / 26 / 8;
    const overtimeAmount =
      rule?.overtimeEnabled ?? true
        ? round2(overtimeHours * hourly * Number(rule?.overtimeRate ?? 1.5))
        : 0;
    const bonusAmount = (rule?.bonusEnabled ?? true) ? (Number(emp.salary) >= 5000 ? 300 : 150) : 0;
    const allowancesAmount = (rule?.allowancesEnabled ?? true) ? 250 : 0;

    const grossAmount = round2(Number(emp.salary) + overtimeAmount + bonusAmount + allowancesAmount);
    const deductionLoan = Number(rule?.deductionLoan ?? 0);
    const deductionDamages = Number(rule?.deductionDamages ?? 0);
    const deductionUniform = Number(rule?.deductionUniform ?? 0);
    const deductionTransport = Number(rule?.deductionTransport ?? 0);
    const deductionMeals = Number(rule?.deductionMeals ?? 0);
    const deductionAdvances = Number(rule?.deductionAdvances ?? 0);
    const deductionOther = Number(rule?.deductionOther ?? 0);
    const totalDed = round2(
      deductionLoan +
        deductionDamages +
        deductionUniform +
        deductionTransport +
        deductionMeals +
        deductionAdvances +
        deductionOther,
    );
    const netAmount = round2(grossAmount - totalDed);

    totalGross += grossAmount;
    totalDeductions += totalDed;
    totalNet += netAmount;

    slips.push({
      employeeId: emp.id,
      baseSalary: Number(emp.salary),
      overtimeHours,
      overtimeAmount,
      bonusAmount,
      allowancesAmount,
      grossAmount,
      deductionLoan,
      deductionDamages,
      deductionUniform,
      deductionTransport,
      deductionMeals,
      deductionAdvances,
      deductionOther,
      totalDeductions: totalDed,
      netAmount,
      workedDays,
      absentDays,
      leaveDays,
      status: "DRAFT",
      branchId,
    });
  }

  const ruleSnapshot = {
    name: rule?.name ?? "Default Payroll Rule",
    startTime: rule?.startTime ?? "08:00",
    graceMinutes: rule?.graceMinutes ?? 15,
    standardMinutesPerDay: rule?.standardMinutesPerDay ?? 480,
    overtimeRate: Number(rule?.overtimeRate ?? 1.5),
    dailyOvertimeThresholdMin: rule?.dailyOvertimeThresholdMin ?? 600,
    defaultPayday: rule?.defaultPayday ?? 25,
    bonusEnabled: rule?.bonusEnabled ?? true,
    overtimeEnabled: rule?.overtimeEnabled ?? true,
    allowancesEnabled: rule?.allowancesEnabled ?? true,
    deductions: {
      loan: Number(rule?.deductionLoan ?? 0),
      damages: Number(rule?.deductionDamages ?? 0),
      uniform: Number(rule?.deductionUniform ?? 0),
      transport: Number(rule?.deductionTransport ?? 0),
      meals: Number(rule?.deductionMeals ?? 0),
      advances: Number(rule?.deductionAdvances ?? 0),
      other: Number(rule?.deductionOther ?? 0),
    },
  };

  const run = await prisma.payrollRun.create({
    data: {
      branchId,
      periodMonth: periodKey,
      status: "DRAFT",
      ruleSnapshot: ruleSnapshot as unknown as Prisma.InputJsonValue,
      totalGross: round2(totalGross),
      totalDeductions: round2(totalDeductions),
      totalNet: round2(totalNet),
      employeeCount: slips.length,
      generatedById: userId,
    },
  });

  if (slips.length > 0) {
    await prisma.payslip.createMany({
      data: slips.map((s) => ({ ...s, runId: run.id })),
    });
  }

  await createNotification({
    branchId,
    title: "Payroll run generated",
    message: `Payroll for ${monthLabel(periodKey)} (${slips.length} employees) is ready to review.`,
    type: "INFO",
    category: "EMPLOYEE",
  });

  return getPayrollRun(run.id, branchId);
}

async function recalcRunTotals(runId: string) {
  const agg = await prisma.payslip.aggregate({
    where: { runId },
    _sum: { grossAmount: true, totalDeductions: true, netAmount: true },
    _count: { _all: true },
  });
  await prisma.payrollRun.update({
    where: { id: runId },
    data: {
      totalGross: new Prisma.Decimal(round2(Number(agg._sum.grossAmount ?? 0))),
      totalDeductions: new Prisma.Decimal(round2(Number(agg._sum.totalDeductions ?? 0))),
      totalNet: new Prisma.Decimal(round2(Number(agg._sum.netAmount ?? 0))),
      employeeCount: agg._count._all,
    },
  });
}

export interface PayslipAdjustInput {
  overtimeHours?: number;
  overtimeAmount?: number;
  bonusAmount?: number;
  allowancesAmount?: number;
  deductionLoan?: number;
  deductionDamages?: number;
  deductionUniform?: number;
  deductionTransport?: number;
  deductionMeals?: number;
  deductionAdvances?: number;
  deductionOther?: number;
  notes?: string;
}

/** Per-payslip adjustments for DRAFT runs (loan, damages, cash shortage, ...). */
export async function updatePayslip(id: string, input: PayslipAdjustInput) {
  const slip = await prisma.payslip.findUnique({
    where: { id },
    include: {
      employee: { select: employeeSelect },
      run: { select: { periodMonth: true, status: true } },
    },
  });
  if (!slip) throw ApiError.notFound("Payslip not found");
  if (slip.run.status !== "DRAFT" || slip.status === "PAID") {
    throw ApiError.conflict("Payslip is locked — process or mark paid first");
  }

  const overtimeHours =
    input.overtimeHours !== undefined ? input.overtimeHours : Number(slip.overtimeHours);
  const overtimeAmount =
    input.overtimeAmount !== undefined ? input.overtimeAmount : Number(slip.overtimeAmount);
  const bonusAmount = input.bonusAmount !== undefined ? input.bonusAmount : Number(slip.bonusAmount);
  const allowancesAmount =
    input.allowancesAmount !== undefined ? input.allowancesAmount : Number(slip.allowancesAmount);

  const deductions = {
    loan: input.deductionLoan !== undefined ? input.deductionLoan : Number(slip.deductionLoan),
    damages:
      input.deductionDamages !== undefined ? input.deductionDamages : Number(slip.deductionDamages),
    uniform:
      input.deductionUniform !== undefined ? input.deductionUniform : Number(slip.deductionUniform),
    transport:
      input.deductionTransport !== undefined
        ? input.deductionTransport
        : Number(slip.deductionTransport),
    meals: input.deductionMeals !== undefined ? input.deductionMeals : Number(slip.deductionMeals),
    advances:
      input.deductionAdvances !== undefined ? input.deductionAdvances : Number(slip.deductionAdvances),
    other: input.deductionOther !== undefined ? input.deductionOther : Number(slip.deductionOther),
  };
  const totalDeductions = round2(Object.values(deductions).reduce((sum, v) => sum + Number(v), 0));
  const grossAmount = round2(Number(slip.baseSalary) + overtimeAmount + bonusAmount + allowancesAmount);
  const netAmount = round2(grossAmount - totalDeductions);

  const updated = await prisma.payslip.update({
    where: { id },
    data: {
      overtimeHours: new Prisma.Decimal(round2(overtimeHours)),
      overtimeAmount: new Prisma.Decimal(round2(overtimeAmount)),
      bonusAmount: new Prisma.Decimal(round2(bonusAmount)),
      allowancesAmount: new Prisma.Decimal(round2(allowancesAmount)),
      deductionLoan: new Prisma.Decimal(deductions.loan),
      deductionDamages: new Prisma.Decimal(deductions.damages),
      deductionUniform: new Prisma.Decimal(deductions.uniform),
      deductionTransport: new Prisma.Decimal(deductions.transport),
      deductionMeals: new Prisma.Decimal(deductions.meals),
      deductionAdvances: new Prisma.Decimal(deductions.advances),
      deductionOther: new Prisma.Decimal(deductions.other),
      totalDeductions: new Prisma.Decimal(totalDeductions),
      netAmount: new Prisma.Decimal(netAmount),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    include: {
      employee: { select: employeeSelect },
      run: { select: { periodMonth: true, status: true } },
    },
  });

  await recalcRunTotals(slip.runId);
  return serializePayslip(updated);
}

export async function processRun(id: string, userId?: string, branchId?: string | null) {
  const run = await prisma.payrollRun.findUnique({ where: { id } });
  if (!run) throw ApiError.notFound("Payroll run not found");
  if (branchId && run.branchId !== branchId) throw ApiError.forbidden();
  if (run.status !== "DRAFT") throw ApiError.conflict("Only DRAFT runs can be processed");

  await prisma.payrollRun.update({
    where: { id },
    data: { status: "PROCESSED", processedAt: new Date(), processedById: userId },
  });
  await createNotification({
    branchId: run.branchId,
    title: "Payroll processed",
    message: `${monthLabel(run.periodMonth)} payroll has been processed and locked.`,
    type: "SUCCESS",
    category: "EMPLOYEE",
  });
  return getPayrollRun(id, branchId);
}

export async function markRunPaid(
  id: string,
  method: PaymentMethod,
  userId?: string,
  branchId?: string | null,
) {
  const run = await prisma.payrollRun.findUnique({ where: { id } });
  if (!run) throw ApiError.notFound("Payroll run not found");
  if (branchId && run.branchId !== branchId) throw ApiError.forbidden();
  if (run.status === "PAID") throw ApiError.conflict("Payroll run is already paid");

  await prisma.payrollRun.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date(), paidById: userId },
  });
  await prisma.payslip.updateMany({
    where: { runId: id },
    data: { status: "PAID", paidAt: new Date(), paymentMethod: method },
  });
  await createNotification({
    branchId: run.branchId,
    title: "Payroll paid",
    message: `${monthLabel(run.periodMonth)} payroll has been marked paid.`,
    type: "SUCCESS",
    category: "EMPLOYEE",
  });
  return getPayrollRun(id, branchId);
}

/** Pay an individual payslip; marks the whole run PAID once every slip is paid. */
export async function markPayslipPaid(id: string, method: PaymentMethod, userId?: string) {
  const slip = await prisma.payslip.findUnique({ where: { id }, include: { run: true } });
  if (!slip) throw ApiError.notFound("Payslip not found");
  if (slip.status === "PAID") throw ApiError.conflict("Payslip is already paid");
  if (slip.run.status === "DRAFT") {
    throw ApiError.conflict("Process the payroll run before paying payslips");
  }

  await prisma.payslip.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date(), paymentMethod: method },
  });

  const remaining = await prisma.payslip.count({
    where: { runId: slip.runId, status: { not: "PAID" } },
  });
  if (remaining === 0) {
    await prisma.payrollRun.update({
      where: { id: slip.runId },
      data: { status: "PAID", paidAt: new Date(), paidById: userId },
    });
  }
  return getPayrollRun(slip.runId);
}

export interface PayslipQuery {
  page?: number;
  pageSize?: number;
}

export async function getMyPayslips(employeeId: string, query: PayslipQuery) {
  const pagination = getPagination(query.page, query.pageSize);
  const where: Prisma.PayslipWhereInput = { employeeId };
  const [rows, total] = await prisma.$transaction([
    prisma.payslip.findMany({
      where,
      include: {
        employee: { select: employeeSelect },
        run: { select: { periodMonth: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.payslip.count({ where }),
  ]);
  return { data: rows.map(serializePayslip), ...buildPageMeta(total, pagination) };
}

/** Self-service summary: monthly salary, next payday, last paid slip, YTD. */
export async function getMyPayrollSummary(employeeId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw ApiError.notFound("Employee not found");

  const [payslips, rule] = await Promise.all([
    prisma.payslip.findMany({
      where: { employeeId },
      include: { run: { select: { periodMonth: true, status: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.payrollRule.findFirst({ where: { branchId: employee.branchId } }),
  ]);

  const lastPaid = payslips.find((p) => p.status === "PAID");
  const ytdPaid = payslips
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.netAmount), 0);

  const payday = rule?.defaultPayday ?? 25;
  const now = new Date();
  const monthOffset = now.getDate() > payday ? 1 : 0;
  const nextPayday = new Date(now.getFullYear(), now.getMonth() + monthOffset, payday);

  return {
    monthlySalary: Number(employee.salary ?? 0),
    payday,
    nextPayday: nextPayday.toISOString(),
    lastPaid: lastPaid
      ? {
          periodMonth: lastPaid.run.periodMonth,
          amount: Number(lastPaid.netAmount),
          paidAt: lastPaid.paidAt?.toISOString() ?? null,
        }
      : null,
    ytdPaid: round2(ytdPaid),
    payslipCount: payslips.length,
  };
}

/** Payday reminder: today >= defaultPayday and previous month's run unpaid. */
export async function paydayReminders(branchId: string | null) {
  const rule = await prisma.payrollRule.findFirst({ where: { branchId } });
  const defaultPayday = rule?.defaultPayday ?? 25;
  const now = new Date();
  const dueToday = now.getDate() >= defaultPayday;
  const prevKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const currentKey = monthKey(now);

  const [prevPaid, current] = await Promise.all([
    prisma.payrollRun.findFirst({ where: { branchId, periodMonth: prevKey, status: "PAID" } }),
    prisma.payrollRun.findFirst({ where: { branchId, periodMonth: currentKey } }),
  ]);
  const previousMonthUnpaid = dueToday && !prevPaid;

  return {
    payday: defaultPayday,
    dueToday,
    previousMonthUnpaid,
    currentMonthProcessed: current ? current.status !== "DRAFT" : false,
    message: previousMonthUnpaid
      ? `Payday is here — ${monthLabel(prevKey)} payroll has not been marked paid.`
      : null,
  };
}
