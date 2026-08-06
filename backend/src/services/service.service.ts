import type { Prisma, ServiceCategory } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";

export interface ServiceListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: ServiceCategory;
  active?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface RequirementInput {
  inventoryItemId: string;
  quantity: number;
}

export interface ServiceInput {
  name?: string;
  description?: string;
  price?: number;
  durationMin?: number | null;
  category?: ServiceCategory;
  icon?: string;
  colour?: string;
  displayOrder?: number;
  isActive?: boolean;
  inventoryRequired?: RequirementInput[];
}

const serviceInclude = {
  inventoryRequired: {
    include: { inventoryItem: { select: { id: true, name: true, unit: true } } },
  },
} satisfies Prisma.ServiceInclude;

type ServiceRow = Prisma.ServiceGetPayload<{ include: typeof serviceInclude }>;

function serialize(service: ServiceRow) {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    price: Number(service.price),
    durationMin: service.durationMin,
    category: service.category,
    icon: service.icon,
    colour: service.colour ?? "#F47B20",
    displayOrder: service.displayOrder,
    isActive: service.isActive,
    inventoryRequired: service.inventoryRequired.map((r) => ({
      inventoryItemId: r.inventoryItemId,
      name: r.inventoryItem.name,
      unit: r.inventoryItem.unit,
      quantity: Number(r.quantity),
    })),
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

async function replaceRequirements(
  tx: Prisma.TransactionClient,
  serviceId: string,
  requirements?: RequirementInput[],
) {
  await tx.serviceInventoryRequirement.deleteMany({ where: { serviceId } });
  if (requirements && requirements.length > 0) {
    await tx.serviceInventoryRequirement.createMany({
      data: requirements.map((r) => ({
        serviceId,
        inventoryItemId: r.inventoryItemId,
        quantity: r.quantity,
      })),
    });
  }
}

function buildWhere(query: ServiceListQuery, branchId: string | null): Prisma.ServiceWhereInput {
  const where: Prisma.ServiceWhereInput = {};
  if (branchId) where.branchId = branchId;
  if (query.category) where.category = query.category;
  if (query.active === "true") where.isActive = true;
  if (query.active === "false") where.isActive = false;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listServices(query: ServiceListQuery, branchId: string | null) {
  const pagination = getPagination(query.page, query.pageSize);
  const where = buildWhere(query, branchId);
  const dir = query.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.ServiceOrderByWithRelationInput =
    query.sortBy === "name" || query.sortBy === "price" || query.sortBy === "displayOrder"
      ? { [query.sortBy]: dir }
      : { displayOrder: "asc" };

  const [rows, total] = await prisma.$transaction([
    prisma.service.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      include: serviceInclude,
    }),
    prisma.service.count({ where }),
  ]);

  return { data: rows.map(serialize), ...buildPageMeta(total, pagination) };
}

export async function getService(id: string) {
  const service = await prisma.service.findUnique({ where: { id }, include: serviceInclude });
  if (!service) throw ApiError.notFound("Service not found");
  return serialize(service);
}

export async function createService(input: ServiceInput, branchId: string | null) {
  const service = await prisma.$transaction(async (tx) => {
    const created = await tx.service.create({
      data: {
        name: input.name!,
        description: input.description || null,
        price: input.price ?? 0,
        durationMin: input.durationMin ?? null,
        category: input.category ?? "EXTERIOR",
        icon: input.icon || null,
        colour: input.colour || "#F47B20",
        displayOrder: input.displayOrder ?? 0,
        isActive: input.isActive ?? true,
        branchId,
      },
    });
    await replaceRequirements(tx, created.id, input.inventoryRequired);
    return tx.service.findUnique({ where: { id: created.id }, include: serviceInclude });
  });
  return serialize(service!);
}

export async function updateService(id: string, input: ServiceInput) {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Service not found");

  const service = await prisma.$transaction(async (tx) => {
    await tx.service.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description || null }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.durationMin !== undefined && { durationMin: input.durationMin ?? null }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.icon !== undefined && { icon: input.icon || null }),
        ...(input.colour !== undefined && { colour: input.colour || "#F47B20" }),
        ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
    if (input.inventoryRequired !== undefined) {
      await replaceRequirements(tx, id, input.inventoryRequired);
    }
    return tx.service.findUnique({ where: { id }, include: serviceInclude });
  });
  return serialize(service!);
}

export async function deleteService(id: string): Promise<void> {
  const washCount = await prisma.washRecord.count({ where: { serviceId: id } });
  if (washCount > 0) {
    throw ApiError.conflict("This service has wash history and cannot be deleted. Deactivate it instead.");
  }
  await prisma.service
    .delete({ where: { id } })
    .catch(() => {
      throw ApiError.notFound("Service not found");
    });
}

export async function duplicateService(id: string) {
  const source = await prisma.service.findUnique({
    where: { id },
    include: { inventoryRequired: true },
  });
  if (!source) throw ApiError.notFound("Service not found");

  const copy = await prisma.$transaction(async (tx) => {
    const created = await tx.service.create({
      data: {
        name: `${source.name} (Copy)`,
        description: source.description,
        price: source.price,
        durationMin: source.durationMin,
        category: source.category,
        icon: source.icon,
        colour: source.colour,
        displayOrder: source.displayOrder + 1,
        isActive: false,
        branchId: source.branchId,
      },
    });
    if (source.inventoryRequired.length > 0) {
      await tx.serviceInventoryRequirement.createMany({
        data: source.inventoryRequired.map((r) => ({
          serviceId: created.id,
          inventoryItemId: r.inventoryItemId,
          quantity: r.quantity,
        })),
      });
    }
    return tx.service.findUnique({ where: { id: created.id }, include: serviceInclude });
  });
  return serialize(copy!);
}

export async function toggleService(id: string, isActive: boolean) {
  const service = await prisma.service
    .update({
      where: { id },
      data: { isActive },
      include: serviceInclude,
    })
    .catch(() => {
      throw ApiError.notFound("Service not found");
    });
  return serialize(service);
}
