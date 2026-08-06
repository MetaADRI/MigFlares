import type { Prisma, WashStatus } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import { generateReference } from "../utils/generate-reference.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";
import { logAction } from "./audit.service.js";
import { createNotification } from "./notification.service.js";

export interface WashListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: WashStatus;
  customerId?: string;
  vehicleId?: string;
}

export interface ExtraInput {
  id: string;
  name: string;
  price: number;
}

export interface WashCreateInput {
  customerId: string;
  vehicleId: string;
  serviceId: string;
  extras?: ExtraInput[];
  discount?: number;
  paymentMethod: "CASH" | "MOBILE_MONEY" | "CARD" | "BANK_TRANSFER";
  employeeId?: string | null;
  notes?: string | null;
  status?: WashStatus;
  beforePhotos?: string[];
  afterPhotos?: string[];
}

const washInclude = {
  customer: true,
  vehicle: true,
  service: true,
  employee: true,
  assignedBy: { select: { id: true, username: true, fullName: true } },
  receipts: { orderBy: { createdAt: "desc" }, take: 1 },
} satisfies Prisma.WashRecordInclude;

type WashRow = Prisma.WashRecordGetPayload<{ include: typeof washInclude }>;

function serialize(job: WashRow) {
  return {
    id: job.id,
    reference: job.reference,
    customerId: job.customerId,
    customerName: `${job.customer.firstName} ${job.customer.lastName}`,
    customerPhone: job.customer.phone,
    vehicleId: job.vehicleId,
    plateNumber: job.vehicle.plateNumber,
    vehicleSummary: `${job.vehicle.make} ${job.vehicle.model}`,
    serviceId: job.serviceId,
    serviceName: job.service.name,
    servicePrice: Number(job.service.price),
    extras: (job.extras as ExtraInput[] | null) ?? [],
    discount: Number(job.discount),
    subtotal: Number(job.subtotal),
    total: Number(job.total),
    paymentMethod: job.paymentMethod,
    employeeId: job.employeeId,
    employeeName: job.employee ? `${job.employee.firstName} ${job.employee.lastName}` : null,
    notes: job.notes,
    status: job.status,
    beforePhotos: (job.beforePhotos as string[] | null) ?? [],
    afterPhotos: (job.afterPhotos as string[] | null) ?? [],
    receiptNo: job.receipts[0]?.receiptNo ?? null,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    cancelledAt: job.cancelledAt?.toISOString() ?? null,
  };
}

function computeTotals(input: WashCreateInput, servicePrice: number) {
  const extrasTotal = (input.extras ?? []).reduce((sum, e) => sum + Number(e.price), 0);
  const discount = Number(input.discount ?? 0);
  const subtotal = servicePrice + extrasTotal;
  const total = Math.max(0, subtotal - discount);
  return { subtotal, total, discount };
}

/** Generate the receipt for a completed wash and update customer/vehicle stats. */
async function finalizeCompletion(jobId: string, issuedById: string) {
  const job = await prisma.washRecord.findUnique({
    where: { id: jobId },
    include: { service: true, customer: true, vehicle: true },
  });
  if (!job) throw ApiError.notFound("Wash job not found");
  const customerName = `${job.customer.firstName} ${job.customer.lastName}`;
  const plateNumber = job.vehicle.plateNumber;
  const jobBranchId = job.branchId;
  const jobReference = job.reference;

  const receiptNo = await generateReference("RCP");
  const items = [
    { name: job.service.name, price: Number(job.service.price) },
    ...(((job.extras as ExtraInput[] | null) ?? []).map((e) => ({ name: e.name, price: Number(e.price) }))),
  ];

  // The existence check runs inside the transaction so concurrent completions
  // can't both create a receipt for the same job.
  return prisma.$transaction(async (tx) => {
    const existing = await tx.receipt.findFirst({ where: { washRecordId: jobId } });
    if (existing) return existing;

    const receipt = await tx.receipt.create({
      data: {
        receiptNo,
        washRecordId: jobId,
        items,
        subtotal: job.subtotal,
        discount: job.discount,
        total: job.total,
        amountPaid: job.total,
        changeDue: 0,
        paymentMethod: job.paymentMethod,
        issuedById,
        branchId: job.branchId,
      },
    });
    await tx.customer.update({
      where: { id: job.customerId },
      data: { lastVisitAt: job.completedAt ?? new Date() },
    });
    await tx.vehicle.update({
      where: { id: job.vehicleId },
      data: { lastWashAt: job.completedAt ?? new Date() },
    });
    return receipt;
  });
  await createNotification({
    title: "Wash completed",
    message: `${customerName} · ${plateNumber} — receipt ${receiptNo} issued`,
    type: "SUCCESS",
    category: "WASH",
    branchId: jobBranchId,
  });
  await logAction({
    action: "WASH_COMPLETED",
    entity: "WashRecord",
    entityId: jobId,
    branchId: jobBranchId ?? null,
    newValue: { reference: jobReference, receiptNo },
  });
}

export async function listWashJobs(query: WashListQuery, branchId: string | null) {
  const pagination = getPagination(query.page, query.pageSize);
  const where: Prisma.WashRecordWhereInput = {
    status: query.status,
    customerId: query.customerId,
    vehicleId: query.vehicleId,
    branchId,
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
    prisma.washRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
      include: washInclude,
    }),
    prisma.washRecord.count({ where }),
  ]);

  return { data: rows.map(serialize), ...buildPageMeta(total, pagination) };
}

export async function getWashJob(id: string) {
  const job = await prisma.washRecord.findUnique({ where: { id }, include: washInclude });
  if (!job) throw ApiError.notFound("Wash job not found");
  return serialize(job);
}

export async function createWashJob(input: WashCreateInput, userId: string, branchId: string | null) {
  const [customer, vehicle, service] = await Promise.all([
    prisma.customer.findUnique({ where: { id: input.customerId } }),
    prisma.vehicle.findUnique({ where: { id: input.vehicleId } }),
    prisma.service.findUnique({ where: { id: input.serviceId } }),
  ]);
  if (!customer || !vehicle || !service) {
    throw ApiError.badRequest("Invalid customer, vehicle or service reference");
  }

  const { subtotal, total, discount } = computeTotals(input, Number(service.price));
  const status = input.status ?? "PENDING";
  const now = new Date();

  const job = await prisma.washRecord.create({
    data: {
      reference: await generateReference("WF"),
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      serviceId: input.serviceId,
      extras: (input.extras ?? []) as unknown as Prisma.InputJsonValue,
      discount,
      subtotal,
      total,
      paymentMethod: input.paymentMethod,
      employeeId: input.employeeId ?? null,
      assignedById: userId,
      notes: input.notes ?? null,
      status,
      beforePhotos: input.beforePhotos ?? [],
      afterPhotos: input.afterPhotos ?? [],
      startedAt: status === "PENDING" ? null : now,
      completedAt: status === "COMPLETED" ? now : null,
      cancelledAt: status === "CANCELLED" ? now : null,
      branchId,
    },
    include: washInclude,
  });

  if (job.status === "COMPLETED") {
    await finalizeCompletion(job.id, userId);
  }
  return serialize(job);
}

export async function updateWashJobStatus(id: string, status: WashStatus, userId: string) {
  const existing = await prisma.washRecord.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Wash job not found");
  if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
    throw ApiError.badRequest(`Cannot change a ${existing.status.toLowerCase()} job`);
  }

  const now = new Date();
  const job = await prisma.washRecord.update({
    where: { id },
    data: {
      status,
      startedAt: status === "IN_PROGRESS" && !existing.startedAt ? now : existing.startedAt,
      completedAt: status === "COMPLETED" ? now : null,
      cancelledAt: status === "CANCELLED" ? now : null,
    },
    include: washInclude,
  });

  let receipt = null;
  if (status === "COMPLETED") {
    receipt = await finalizeCompletion(id, userId);
  }

  // Re-fetch so receiptNo reflects the freshly created receipt.
  const refreshed = await prisma.washRecord.findUnique({ where: { id }, include: washInclude });

  return {
    washJob: serialize(refreshed ?? job),
    receipt: receipt
      ? {
          id: receipt.id,
          receiptNo: receipt.receiptNo,
          washJobId: receipt.washRecordId,
          customerName: `${job.customer.firstName} ${job.customer.lastName}`,
          plateNumber: job.vehicle.plateNumber,
          items: receipt.items,
          subtotal: Number(receipt.subtotal),
          discount: Number(receipt.discount),
          total: Number(receipt.total),
          amountPaid: Number(receipt.amountPaid),
          changeDue: Number(receipt.changeDue),
          paymentMethod: receipt.paymentMethod,
          issuedAt: receipt.createdAt.toISOString(),
        }
      : null,
  };
}

export async function getReceipt(washJobId: string) {
  const receipt = await prisma.receipt.findFirst({ where: { washRecordId: washJobId } });
  if (!receipt) throw ApiError.notFound("No receipt for this wash job");
  const job = await prisma.washRecord.findUnique({
    where: { id: washJobId },
    select: { customer: true, vehicle: true },
  });
  return {
    id: receipt.id,
    receiptNo: receipt.receiptNo,
    washJobId: receipt.washRecordId,
    customerName: job ? `${job.customer.firstName} ${job.customer.lastName}` : "",
    plateNumber: job?.vehicle.plateNumber ?? "",
    items: receipt.items,
    subtotal: Number(receipt.subtotal),
    discount: Number(receipt.discount),
    total: Number(receipt.total),
    amountPaid: Number(receipt.amountPaid),
    changeDue: Number(receipt.changeDue),
    paymentMethod: receipt.paymentMethod,
    issuedAt: receipt.createdAt.toISOString(),
  };
}

export async function listWashJobsByCustomer(customerId: string) {
  const rows = await prisma.washRecord.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: washInclude,
  });
  return rows.map(serialize);
}
