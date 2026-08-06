import { Prisma, AttendanceStatus } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";

/* ------------------------------------------------------------------ */
/* Attendance — per-employee-per-day snapshots feeding payroll.        */
/* Records are created and corrected manually by staff (the door       */
/* keeper marks who is present/late/absent/on leave); the system does  */
/* NOT self-track attendance from logins or clock buttons.             */
/* ------------------------------------------------------------------ */

const startOfDayLocal = (d: Date): Date => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

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
  /** YYYY-MM-DD in the branch's local day; defaults to today. */
  date?: string;
  status: AttendanceStatus;
  clockInAt?: Date | null;
  clockOutAt?: Date | null;
  notes?: string;
  branchId?: string | null;
}

/**
 * Manually record attendance for an employee on a given day (create or
 * replace). The door keeper picks the status explicitly — the system does
 * not derive it. When both clock-in and clock-out are provided, hours and
 * overtime are recomputed against the branch's payroll rule.
 */
export async function markAttendanceManual(input: MarkAttendanceInput, userId?: string) {
  const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
  if (!employee) throw ApiError.notFound("Employee not found");
  if (input.branchId && employee.branchId !== input.branchId) {
    throw ApiError.forbidden("Employee does not belong to your branch");
  }

  const date = input.date
    ? (() => {
        const [y, m, d] = input.date.split("-").map(Number);
        if (!y || !m || !d) throw ApiError.badRequest("date must be YYYY-MM-DD");
        return new Date(y, m - 1, d);
      })()
    : startOfDayLocal(new Date());

  if (input.clockInAt && input.clockOutAt && input.clockOutAt < input.clockInAt) {
    throw ApiError.badRequest("Clock out must be after clock in");
  }

  const clockInAt = input.clockInAt ?? null;
  const clockOutAt = input.clockOutAt ?? null;

  let hoursWorked = new Prisma.Decimal(0);
  let overtimeHours = new Prisma.Decimal(0);
  let overtimeMinutes = 0;
  if (clockInAt && clockOutAt) {
    const rule = await getRule(employee.branchId);
    const totalMin = Math.max(0, Math.round((clockOutAt.getTime() - clockInAt.getTime()) / 60_000));
    const overtimeMin = Math.max(0, totalMin - rule.dailyOvertimeThresholdMin);
    overtimeHours = new Prisma.Decimal(round2(overtimeMin / 60));
    overtimeMinutes = overtimeMin;
    hoursWorked = new Prisma.Decimal(round2((totalMin - overtimeMin) / 60));
  }

  const data = {
    status: input.status,
    clockInAt,
    clockOutAt,
    hoursWorked,
    overtimeHours,
    overtimeMinutes,
    notes: input.notes ?? null,
    source: "MANUAL" as const,
    correctedById: userId ?? null,
    correctedAt: new Date(),
  };

  const existing = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date } },
  });
  const record = existing
    ? await prisma.attendanceRecord.update({ where: { id: existing.id }, data })
    : await prisma.attendanceRecord.create({
        data: { employeeId: employee.id, branchId: employee.branchId, date, ...data },
      });
  return serialize(record);
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

/** Today's headcount snapshot by status.
 *  Present/late come from today's records; on-leave is derived from APPROVED
 *  leave covering today plus any ON_LEAVE records; absent is everyone else
 *  on the active roster. Only staff-managed records are reflected here. */
export async function getTodaySummary(branchId: string | null) {
  const date = startOfDayLocal(new Date());
  const tomorrow = new Date(date.getTime() + 86_400_000);
  const scope = branchId ? { branchId } : {};
  const [records, active, approvedLeave] = await Promise.all([
    prisma.attendanceRecord.findMany({ where: { date, ...scope }, select: { employeeId: true, status: true } }),
    prisma.employee.findMany({
      where: { isActive: true, attendanceRequired: true, ...scope },
      select: { id: true },
    }),
    prisma.leaveRequest.findMany({
      where: { status: "APPROVED", startDate: { lte: tomorrow }, endDate: { gte: date } },
      select: { employeeId: true },
    }),
  ]);

  let present = 0;
  let late = 0;
  let holiday = 0;
  const onLeaveRecorded = new Set<string>();
  for (const r of records) {
    if (r.status === "PRESENT") present++;
    else if (r.status === "LATE") late++;
    else if (r.status === "HOLIDAY") holiday++;
    else if (r.status === "ON_LEAVE") onLeaveRecorded.add(r.employeeId);
  }

  const activeIds = new Set(active.map((e) => e.id));
  const onLeaveApproved = new Set<string>();
  for (const l of approvedLeave) {
    if (activeIds.has(l.employeeId)) onLeaveApproved.add(l.employeeId);
  }
  const onLeave = new Set([...onLeaveRecorded, ...onLeaveApproved]).size;
  const absent = Math.max(0, active.length - present - late - holiday - onLeave);

  return {
    date: date.toISOString(),
    present,
    late,
    absent,
    onLeave,
    holiday,
    total: present + late + absent + onLeave + holiday,
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
