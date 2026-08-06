import type { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import { generateReference } from "../utils/generate-reference.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";

export interface ReceiptListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  vehicleId?: string;
  employeeId?: string;
  status?: PaymentStatus;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

const receiptInclude = {
  washRecord: {
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      vehicle: { select: { id: true, plateNumber: true, make: true, model: true } },
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  issuedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.ReceiptInclude;

type ReceiptRow = Prisma.ReceiptGetPayload<{ include: typeof receiptInclude }>;

function serialize(receipt: ReceiptRow) {
  const job = receipt.washRecord;
  return {
    id: receipt.id,
    receiptNo: receipt.receiptNo,
    washJobId: receipt.washRecordId,
    washJobReference: job.reference,
    customerId: job.customer.id,
    customerName: `${job.customer.firstName} ${job.customer.lastName}`,
    customerPhone: job.customer.phone,
    vehicleId: job.vehicle.id,
    plateNumber: job.vehicle.plateNumber,
    vehicleSummary: `${job.vehicle.make} ${job.vehicle.model}`,
    employeeId: job.employee?.id ?? null,
    employeeName: job.employee ? `${job.employee.firstName} ${job.employee.lastName}` : null,
    items: receipt.items as { name: string; price: number }[],
    subtotal: Number(receipt.subtotal),
    discount: Number(receipt.discount),
    tax: Number(receipt.tax),
    total: Number(receipt.total),
    amountPaid: Number(receipt.amountPaid),
    changeDue: Number(receipt.changeDue),
    paymentMethod: receipt.paymentMethod,
    status: receipt.status,
    issuedByName: receipt.issuedBy.fullName,
    voidReason: receipt.voidReason,
    voidedAt: receipt.voidedAt?.toISOString() ?? null,
    issuedAt: receipt.createdAt.toISOString(),
  };
}

export async function listReceipts(query: ReceiptListQuery, branchId: string | null) {
  const pagination = getPagination(query.page, query.pageSize);
  const where: Prisma.ReceiptWhereInput = {};
  if (branchId) where.branchId = branchId;
  if (query.status) where.status = query.status;
  if (query.paymentMethod) where.paymentMethod = query.paymentMethod as PaymentMethod;
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {
      ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { lt: new Date(new Date(query.dateTo).getTime() + 24 * 3600_000) } : {}),
    };
  }

  const washWhere: Prisma.WashRecordWhereInput = {};
  if (query.customerId) washWhere.customerId = query.customerId;
  if (query.vehicleId) washWhere.vehicleId = query.vehicleId;
  if (query.employeeId) washWhere.employeeId = query.employeeId;
  if (query.search) {
    washWhere.OR = [
      { reference: { contains: query.search, mode: "insensitive" } },
      { customer: { OR: [
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search } },
      ] } },
      { vehicle: { plateNumber: { contains: query.search, mode: "insensitive" } } },
      { employee: { OR: [
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
      ] } },
    ];
  }
  if (Object.keys(washWhere).length > 0) {
    where.washRecord = washWhere;
  }

  const sortDir = query.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.ReceiptOrderByWithRelationInput =
    query.sortBy === "total" ? { total: sortDir } : { createdAt: sortDir };

  const [rows, total] = await prisma.$transaction([
    prisma.receipt.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      include: receiptInclude,
    }),
    prisma.receipt.count({ where }),
  ]);

  return { data: rows.map(serialize), ...buildPageMeta(total, pagination) };
}

export async function getReceiptById(id: string) {
  const receipt = await prisma.receipt.findUnique({ where: { id }, include: receiptInclude });
  if (!receipt) throw ApiError.notFound("Receipt not found");
  return serialize(receipt);
}

export async function voidReceipt(id: string, reason: string, userId: string) {
  const existing = await prisma.receipt.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Receipt not found");
  if (existing.status === "VOIDED") throw ApiError.badRequest("Receipt is already voided");

  const receipt = await prisma.receipt.update({
    where: { id },
    data: { status: "VOIDED", voidReason: reason, voidedAt: new Date(), voidedById: userId },
    include: receiptInclude,
  });
  return serialize(receipt);
}

export async function duplicateReceipt(id: string, issuedById: string) {
  const source = await prisma.receipt.findUnique({
    where: { id },
    include: { washRecord: { select: { branchId: true } } },
  });
  if (!source) throw ApiError.notFound("Receipt not found");

  const receiptNo = await generateReference("RCP");
  const copy = await prisma.receipt.create({
    data: {
      receiptNo,
      washRecordId: source.washRecordId,
      originalReceiptId: source.id,
      items: source.items as Prisma.InputJsonValue,
      subtotal: source.subtotal,
      discount: source.discount,
      tax: source.tax,
      total: source.total,
      amountPaid: source.amountPaid,
      changeDue: source.changeDue,
      paymentMethod: source.paymentMethod,
      status: "PAID",
      issuedById,
      branchId: source.washRecord.branchId,
    },
    include: receiptInclude,
  });
  return serialize(copy as ReceiptRow);
}
