import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import { generateReference } from "../utils/generate-reference.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";
import { logAction } from "./audit.service.js";
import { createNotification } from "./notification.service.js";

export interface BookingListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: BookingStatus;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
}

export interface BookingCreateInput {
  customerId: string;
  vehicleId: string;
  serviceId: string;
  employeeId?: string | null;
  scheduledAt: Date | string;
  durationMin?: number;
  notes?: string | null;
  status?: BookingStatus;
}

const bookingInclude = {
  customer: true,
  vehicle: true,
  service: true,
  employee: true,
  createdBy: { select: { id: true, username: true, fullName: true } },
} satisfies Prisma.BookingInclude;

type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

function serialize(booking: BookingRow) {
  return {
    id: booking.id,
    reference: booking.reference,
    customerId: booking.customerId,
    customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
    customerPhone: booking.customer.phone,
    vehicleId: booking.vehicleId,
    plateNumber: booking.vehicle.plateNumber,
    vehicleSummary: `${booking.vehicle.make} ${booking.vehicle.model}`,
    serviceId: booking.serviceId,
    serviceName: booking.service.name,
    servicePrice: Number(booking.service.price),
    employeeId: booking.employeeId,
    employeeName: booking.employee
      ? `${booking.employee.firstName} ${booking.employee.lastName}`
      : null,
    scheduledAt: booking.scheduledAt.toISOString(),
    durationMin: booking.durationMin,
    status: booking.status,
    notes: booking.notes,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

/** Statuses that still occupy the slot and must be checked for overlap. */
const ACTIVE_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED"];

/** Allowed status transitions (terminal states cannot change). */
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

function formatSlot(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Find active bookings that clash with the proposed slot for the same vehicle
 * or the same assigned attendant. Prisma cannot compare scheduledAt+duration,
 * so candidates are pre-filtered in SQL then re-checked in JS.
 */
async function findSlotConflict(input: {
  vehicleId: string;
  employeeId?: string | null;
  scheduledAt: Date;
  durationMin: number;
  excludeId?: string;
}) {
  const start = input.scheduledAt.getTime();
  const end = start + input.durationMin * 60_000;

  const candidates = await prisma.booking.findMany({
    where: {
      id: input.excludeId ? { not: input.excludeId } : undefined,
      status: { in: ACTIVE_STATUSES },
      scheduledAt: { lt: new Date(end) },
      OR: [
        { vehicleId: input.vehicleId },
        ...(input.employeeId ? [{ employeeId: input.employeeId }] : []),
      ],
    },
    select: { scheduledAt: true, durationMin: true },
    take: 50,
  });

  return candidates.filter((c) => {
    const existingStart = c.scheduledAt.getTime();
    const existingEnd = existingStart + c.durationMin * 60_000;
    return existingStart < end && existingEnd > start;
  });
}

export async function listBookings(query: BookingListQuery, branchId: string | null) {
  const pagination = getPagination(query.page, query.pageSize);
  const where: Prisma.BookingWhereInput = {
    branchId,
    status: query.status,
    customerId: query.customerId,
    ...(query.dateFrom || query.dateTo
      ? {
          scheduledAt: {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
          },
        }
      : {}),
    ...(query.search && {
      OR: [
        { reference: { contains: query.search, mode: "insensitive" } },
        {
          customer: {
            OR: [
              { firstName: { contains: query.search, mode: "insensitive" } },
              { lastName: { contains: query.search, mode: "insensitive" } },
            ],
          },
        },
        { vehicle: { plateNumber: { contains: query.search, mode: "insensitive" } } },
      ],
    }),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      skip: pagination.skip,
      take: pagination.take,
      include: bookingInclude,
    }),
    prisma.booking.count({ where }),
  ]);

  return { data: rows.map(serialize), ...buildPageMeta(total, pagination) };
}

export async function getBooking(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) throw ApiError.notFound("Booking not found");
  return serialize(booking);
}

export async function createBooking(
  input: BookingCreateInput,
  userId: string,
  branchId: string | null
) {
  const [customer, vehicle, service] = await Promise.all([
    prisma.customer.findUnique({ where: { id: input.customerId } }),
    prisma.vehicle.findUnique({ where: { id: input.vehicleId } }),
    prisma.service.findUnique({ where: { id: input.serviceId } }),
  ]);
  if (!customer || !vehicle || !service) {
    throw ApiError.badRequest("Invalid customer, vehicle or service reference");
  }
  if (input.employeeId) {
    const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee || !employee.isActive) {
      throw ApiError.badRequest("Selected attendant is not active");
    }
  }

  const scheduledAt = input.scheduledAt instanceof Date ? input.scheduledAt : new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) throw ApiError.badRequest("Invalid scheduled time");
  const durationMin = input.durationMin ?? service.durationMin ?? 30;

  const conflicts = await findSlotConflict({
    vehicleId: input.vehicleId,
    employeeId: input.employeeId,
    scheduledAt,
    durationMin,
  });
  if (conflicts.length > 0) {
    throw ApiError.conflict(
      `Slot conflict at ${formatSlot(scheduledAt)} — the vehicle or attendant already has an active booking (${conflicts.length} overlapping).`
    );
  }

  const booking = await prisma.booking.create({
    data: {
      reference: await generateReference("BK"),
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      serviceId: input.serviceId,
      employeeId: input.employeeId ?? null,
      scheduledAt,
      durationMin,
      notes: input.notes ?? null,
      status: input.status ?? "PENDING",
      createdById: userId,
      branchId,
    },
    include: bookingInclude,
  });

  await createNotification({
    title: "New booking scheduled",
    message: `${booking.reference} · ${booking.customer.firstName} ${booking.customer.lastName} · ${vehicle.plateNumber} · ${service.name} on ${formatSlot(scheduledAt)}`,
    type: "INFO",
    category: "BOOKING",
    branchId,
  });
  await logAction({
    action: "BOOKING_CREATED",
    entity: "Booking",
    entityId: booking.id,
    userId,
    branchId,
    newValue: { reference: booking.reference, scheduledAt: scheduledAt.toISOString() },
  });

  return serialize(booking);
}

export async function updateBooking(
  id: string,
  input: Partial<BookingCreateInput>,
  userId: string
) {
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Booking not found");
  if (existing.status === "COMPLETED" || existing.status === "CANCELLED" || existing.status === "NO_SHOW") {
    throw ApiError.badRequest(`Cannot edit a ${existing.status.toLowerCase()} booking`);
  }

  const scheduledAt =
    input.scheduledAt instanceof Date ? input.scheduledAt : input.scheduledAt ? new Date(input.scheduledAt) : existing.scheduledAt;
  if (Number.isNaN(scheduledAt.getTime())) throw ApiError.badRequest("Invalid scheduled time");
  const durationMin = input.durationMin ?? existing.durationMin;

  const vehicleId = input.vehicleId ?? existing.vehicleId;
  const employeeId = input.employeeId !== undefined ? input.employeeId : existing.employeeId;
  if (employeeId) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || !employee.isActive) {
      throw ApiError.badRequest("Selected attendant is not active");
    }
  }

  const conflicts = await findSlotConflict({
    vehicleId,
    employeeId,
    scheduledAt,
    durationMin,
    excludeId: id,
  });
  if (conflicts.length > 0) {
    throw ApiError.conflict(
      `Slot conflict at ${formatSlot(scheduledAt)} — the vehicle or attendant already has an active booking (${conflicts.length} overlapping).`
    );
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: {
      ...(input.customerId ? { customerId: input.customerId } : {}),
      vehicleId,
      ...(input.serviceId ? { serviceId: input.serviceId } : {}),
      employeeId: employeeId ?? null,
      scheduledAt,
      durationMin,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: bookingInclude,
  });

  await logAction({
    action: "BOOKING_UPDATED",
    entity: "Booking",
    entityId: id,
    userId,
    branchId: booking.branchId,
    newValue: { reference: booking.reference, scheduledAt: scheduledAt.toISOString() },
  });

  return serialize(booking);
}

export async function updateBookingStatus(id: string, status: BookingStatus, userId: string) {
  const existing = await prisma.booking.findUnique({
    where: { id },
    include: { customer: true, vehicle: true, service: true },
  });
  if (!existing) throw ApiError.notFound("Booking not found");
  if (!TRANSITIONS[existing.status].includes(status)) {
    throw ApiError.badRequest(
      `Cannot move booking from ${existing.status} to ${status}`
    );
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: { status },
    include: bookingInclude,
  });

  const customerName = `${existing.customer.firstName} ${existing.customer.lastName}`;
  const plateNumber = existing.vehicle.plateNumber;
  const meta: Record<string, string> = {
    CONFIRMED: "confirmed",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    NO_SHOW: "marked as no-show",
  };

  await createNotification({
    title: "Booking updated",
    message: `${existing.reference} · ${customerName} · ${plateNumber} ${meta[status]}`,
    type: status === "CANCELLED" || status === "NO_SHOW" ? "WARNING" : "SUCCESS",
    category: "BOOKING",
    branchId: booking.branchId,
  });
  await logAction({
    action: `BOOKING_${status}`,
    entity: "Booking",
    entityId: id,
    userId,
    branchId: booking.branchId,
    oldValue: { status: existing.status },
    newValue: { status },
  });

  return serialize(booking);
}

export async function listBookingsByCustomer(customerId: string) {
  const rows = await prisma.booking.findMany({
    where: { customerId },
    orderBy: { scheduledAt: "desc" },
    take: 50,
    include: bookingInclude,
  });
  return rows.map(serialize);
}
