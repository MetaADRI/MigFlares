import type { CustomerStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";

export interface CustomerListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CustomerStatus;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface CustomerInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

type SortableKeys = "name" | "createdAt" | "lastVisitAt";

function resolveOrderBy(sortBy: string, dir: "asc" | "desc"): Prisma.CustomerOrderByWithRelationInput {
  const key: SortableKeys | null =
    sortBy === "name" ? "name" : sortBy === "lastVisitAt" ? "lastVisitAt" : sortBy === "createdAt" ? "createdAt" : null;
  if (!key) return { createdAt: "desc" };
  if (key === "name") return { firstName: dir };
  return { [key]: dir };
}

/** List customers with search, status filter and stats per customer. */
export async function listCustomers(query: CustomerListQuery, branchId: string | null) {
  const pagination = getPagination(query.page, query.pageSize);
  const dir = query.sortDir === "asc" ? "asc" : "desc";

  const where: Prisma.CustomerWhereInput = {};
  if (branchId) where.branchId = branchId;
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: "insensitive" } },
      { lastName: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search } },
    ];
  }

  const [rows, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      orderBy: resolveOrderBy(query.sortBy ?? "createdAt", dir),
      skip: pagination.skip,
      take: pagination.take,
      include: { _count: { select: { vehicles: true, washRecords: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  const aggregates = await prisma.washRecord.groupBy({
    by: ["customerId"],
    where: { customerId: { in: rows.map((r) => r.id) }, status: "COMPLETED" },
    _sum: { total: true },
  });
  const spentByCustomer = new Map(aggregates.map((a) => [a.customerId, Number(a._sum.total ?? 0)]));

  const data = rows.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    phone: r.phone,
    email: r.email,
    address: r.address,
    notes: r.notes,
    avatarUrl: r.avatarUrl,
    status: r.status,
    vehiclesCount: r._count.vehicles,
    visits: r._count.washRecords,
    totalSpent: spentByCustomer.get(r.id) ?? 0,
    lastVisitAt: r.lastVisitAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  return { data, ...buildPageMeta(total, pagination) };
}

export async function getCustomer(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      _count: { select: { vehicles: true, washRecords: true } },
      vehicles: true,
    },
  });
  if (!customer) throw ApiError.notFound("Customer not found");
  const spent = await prisma.washRecord.aggregate({
    where: { customerId: id, status: "COMPLETED" },
    _sum: { total: true },
  });
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    notes: customer.notes,
    avatarUrl: customer.avatarUrl,
    status: customer.status,
    vehiclesCount: customer._count.vehicles,
    visits: customer._count.washRecords,
    totalSpent: Number(spent._sum.total ?? 0),
    lastVisitAt: customer.lastVisitAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
    vehicles: customer.vehicles,
  };
}

export async function createCustomer(input: CustomerInput, branchId: string | null) {
  const customer = await prisma.customer.create({
    data: {
      firstName: input.firstName!,
      lastName: input.lastName!,
      phone: input.phone!,
      email: input.email || null,
      address: input.address || null,
      notes: input.notes || null,
      branchId,
    },
  });
  return getCustomer(customer.id);
}

export async function updateCustomer(id: string, input: CustomerInput) {
  await prisma.customer.findUniqueOrThrow({ where: { id } }).catch(() => {
    throw ApiError.notFound("Customer not found");
  });
  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.address !== undefined && { address: input.address || null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
    },
  });
  return getCustomer(customer.id);
}

export async function deleteCustomer(id: string): Promise<void> {
  await prisma.customer
    .delete({ where: { id } })
    .catch(() => {
      throw ApiError.notFound("Customer not found");
    });
}
