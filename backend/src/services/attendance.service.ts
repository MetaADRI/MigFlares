import { Prisma, AttendanceStatus } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";

/* ------------------------------------------------------------------ */
/* Attendance — per-employee-per-day snapshots feeding payroll.         */
/* Auto-created on first login of the day (source LOGIN) or via the    */
/* clock buttons (source CLOCK_BUTTON), then finalized on End Shift.   */
/* ------------------------------------------------------------------ */

const startOfDayLocal = (d: Date): Date => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** "08:00" -> minutes since local midnight. */
const parseHm = (hm: string): number => {
  const [h, m] = hm.split(":").map(Number);
  return (h ?? 8) * 60 + (m ?? 0);
};

const minutesOf = (d: Date): number => d.getHours() * 60 + d.getMinutes();

interface RuleDefaults {
  startTime: string;
  graceMinutes: number;
  standardMinutesPerDay: number;
  overtimeRate: number;
  dailyOvertimeThresholdMin: number;
}

async function getRule(branchId: string | null): Promise<RuleDefaults> {
  const rule = await prisma.payrollRule.findFirst({ where: { branchId } });
  return {
    startTime: rule?.startTime ?? "08:00",
    graceMinutes: rule?.graceMinutes ?? 15,
    standardMinutesPerDay: rule?.standardMinutesPerDay ?? 480,
    overtimeRate: Number(rule?.overtimeRate ?? 1.5),
    dailyOvertimeThresholdMin: rule?.dailyOvertimeThresholdMin ?? 600,
  };
}

const employeeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  position: true,
} as const;

type BaseRow = Prisma.AttendanceRecordGetPayload<Record<string, never>>;

type AttendanceRow = BaseRow & {
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
  };
};

function serialize(r: AttendanceRow) {
  return {
    id: r.id,
    date: r.date.toISOString(),
    status: r.status,
    clockInAt: r.clockInAt?.toISOString() ?? null,
    clockOutAt: r.clockOutAt?.toISOString() ?? null,
    hoursWorked: r.hoursWorked !== null ? Number(r.hoursWorked) : null,
    overtimeHours: r.overtimeHours !== null ? Number(r.overtimeHours) : null,
    overtimeMinutes: r.overtimeMinutes,
    source: r.source,
    timeEntryId: r.timeEntryId,
    notes: r.notes,
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

export interface MarkAttendanceInput {
  employeeId: string;
  branchId: string | null;
  source: string;
  clockInAt?: Date;
  timeEntryId?: string;
  notes?: string;
}

/**
 * Upsert today's attendance record. Keeps the earliest clock-in, honours an
 * existing time-entry link (a login snapshot can later be linked to a manual
 * clock button without breaking the unique timeEntryId constraint).
 */
export async function markAttendance(input: MarkAttendanceInput) {
  const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
  if (!employee) throw ApiError.notFound("Employee not found");
  if (!employee.attendanceRequired) return null;

  const date = startOfDayLocal(new Date());
  const clockInAt = input.clockInAt ?? new Date();
  const rule = await getRule(input.branchId);
  const late = minutesOf(clockInAt) > parseHm(rule.startTime) + rule.graceMinutes;
  const status: AttendanceStatus = late ? "LATE" : "PRESENT";

  const existing = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: input.employeeId, date } },
  });

  if (existing) {
    const data: Prisma.AttendanceRecordUpdateInput = {};
    const earlier = !existing.clockInAt || clockInAt.getTime() < existing.clockInAt.getTime();
    if (earlier) {
      data.clockInAt = clockInAt;
      data.status = status;
    }
    if (existing.timeEntryId == null && input.timeEntryId) {
      data.timeEntry = { connect: { id: input.timeEntryId } };
    }
    if (input.notes) data.notes = input.notes;
    const updated = await prisma.attendanceRecord.update({ where: { id: existing.id }, data });
    return serialize(updated);
  }

  const record = await prisma.attendanceRecord.create({
    data: {
      employeeId: input.employeeId,
      branchId: input.branchId,
      date,
      status,
      clockInAt,
      hoursWorked: new Prisma.Decimal(0),
      overtimeHours: new Prisma.Decimal(0),
      overtimeMinutes: 0,
      source: input.source,
      timeEntryId: input.timeEntryId ?? null,
      notes: input.notes,
    },
  });
  return serialize(record);
}

/** Best-effort auto-attendance on login — never throws into the login flow. */
export async function recordLoginAttendance(
  userId: string,
  branchId: string | null,
): Promise<void> {
  try {
    const employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee || !employee.attendanceRequired) return;
    await markAttendance({ employeeId: employee.id, branchId, source: "LOGIN" });
  } catch {
    /* attendance is best-effort */
  }
}

export interface FinalizeAttendanceInput {
  employeeId: string;
  branchId: string | null;
  timeEntryId?: string;
  clockOutAt?: Date;
}

/**
 * End-of-shift recompute: regular hours capped at the overtime threshold,
 * anything beyond becomes overtime. Linked via the TimeEntry when available,
 * otherwise falls back to today's record for the employee.
 */
export async function finalizeAttendance(input: FinalizeAttendanceInput) {
  const date = startOfDayLocal(new Date());
  const linked = input.timeEntryId
    ? await prisma.attendanceRecord.findFirst({
        where: { employeeId: input.employeeId, timeEntryId: input.timeEntryId },
      })
    : null;
  const target =
    linked ??
    (await prisma.attendanceRecord.findFirst({ where: { employeeId: input.employeeId, date } }));
  if (!target) return null;

  const clockOutAt = input.clockOutAt ?? new Date();
  const clockInAt = target.clockInAt ?? clockOutAt;
  const rule = await getRule(input.branchId);
  const totalMin = Math.max(0, Math.round((clockOutAt.getTime() - clockInAt.getTime()) / 60_000));
  const overtimeMin = Math.max(0, totalMin - rule.dailyOvertimeThresholdMin);
  const regularMin = totalMin - overtimeMin;

  const updated = await prisma.attendanceRecord.update({
    where: { id: target.id },
    data: {
      clockOutAt,
      hoursWorked: new Prisma.Decimal(round2(regularMin / 60)),
      overtimeHours: new Prisma.Decimal(round2(overtimeMin / 60)),
      overtimeMinutes: overtimeMin,
      ...(target.timeEntryId == null && input.timeEntryId ? { timeEntryId: input.timeEntryId } : {}),
    },
  });
  return serialize(updated);
}

export interface AttendanceListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  month?: string;
  employeeId?: string;
}

export async function listAttendance(query: AttendanceListQuery, branchId: string | null) {
  const pagination = getPagination(query.page, query.pageSize);
  const where: Prisma.AttendanceRecordWhereInput = {};
  if (branchId) where.branchId = branchId;
  if (query.employeeId) where.employeeId = query.employeeId;
  if (query.status && query.status !== "ALL") where.status = query.status as AttendanceStatus;
  if (query.month) {
    const [y, m] = query.month.split("-").map(Number);
    where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  } else if (query.from || query.to) {
    where.date = {
      ...(query.from ? { gte: new Date(`${query.from}T00:00:00`) } : {}),
      ...(query.to ? { lt: new Date(`${query.to}T00:00:00`) } : {}),
    };
  }
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
    prisma.attendanceRecord.findMany({
      where,
      include: { employee: { select: employeeSelect } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.attendanceRecord.count({ where }),
  ]);

  return { data: rows.map(serialize), ...buildPageMeta(total, pagination) };
}

export async function getMyAttendance(employeeId: string, query: AttendanceListQuery) {
  return listAttendance({ ...query, employeeId }, null);
}

/** Today's headcount snapshot by status + staff currently clocked in. */
export async function getTodaySummary(branchId: string | null) {
  const date = startOfDayLocal(new Date());
  const where: Prisma.AttendanceRecordWhereInput = { date, ...(branchId ? { branchId } : {}) };
  const [rows, clockedIn] = await Promise.all([
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.timeEntry.count({
      where: { clockOutAt: null, ...(branchId ? { branchId } : {}) },
    }),
  ]);
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.status] = r._count._all;
  return {
    date: date.toISOString(),
    present: counts.PRESENT ?? 0,
    late: counts.LATE ?? 0,
    absent: counts.ABSENT ?? 0,
    onLeave: counts.ON_LEAVE ?? 0,
    holiday: counts.HOLIDAY ?? 0,
    total: rows.reduce((sum, r) => sum + r._count._all, 0),
    clockedInNow: clockedIn,
  };
}

export interface AttendanceCorrectionInput {
  status?: AttendanceStatus;
  clockInAt?: Date | null;
  clockOutAt?: Date | null;
  notes?: string;
}

/** Manager correction — recomputes hours/overtime from the edited times. */
export async function correctAttendance(
  id: string,
  input: AttendanceCorrectionInput,
  userId?: string,
) {
  const record = await prisma.attendanceRecord.findUnique({ where: { id } });
  if (!record) throw ApiError.notFound("Attendance record not found");

  const data: Prisma.AttendanceRecordUpdateInput = {
    ...(userId ? { correctedBy: { connect: { id: userId } } } : {}),
    correctedAt: new Date(),
    source: "MANUAL",
  };
  if (input.status) data.status = input.status;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.clockInAt !== undefined) data.clockInAt = input.clockInAt;
  if (input.clockOutAt !== undefined) data.clockOutAt = input.clockOutAt;

  const clockInAt = input.clockInAt !== undefined ? input.clockInAt : record.clockInAt;
  const clockOutAt = input.clockOutAt !== undefined ? input.clockOutAt : record.clockOutAt;
  if (clockInAt && clockOutAt) {
    const rule = await getRule(record.branchId);
    const totalMin = Math.max(0, Math.round((clockOutAt.getTime() - clockInAt.getTime()) / 60_000));
    const overtimeMin = Math.max(0, totalMin - rule.dailyOvertimeThresholdMin);
    data.hoursWorked = new Prisma.Decimal(round2((totalMin - overtimeMin) / 60));
    data.overtimeHours = new Prisma.Decimal(round2(overtimeMin / 60));
    data.overtimeMinutes = overtimeMin;
  } else if (clockOutAt === null) {
    data.hoursWorked = new Prisma.Decimal(0);
    data.overtimeHours = new Prisma.Decimal(0);
    data.overtimeMinutes = 0;
  }

  const updated = await prisma.attendanceRecord.update({ where: { id }, data });
  return serialize(updated);
}
