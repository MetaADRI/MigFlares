import type { InventoryCategory, MovementType, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";
import { logAction } from "./audit.service.js";
import { createNotification } from "./notification.service.js";

export interface InventoryListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: InventoryCategory;
  stock?: "all" | "low" | "out";
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface InventoryInput {
  name?: string;
  sku?: string;
  category?: InventoryCategory;
  supplier?: string | null;
  unit?: string;
  costPrice?: number;
  sellingPrice?: number;
  quantityAvailable?: number;
  minimumQuantity?: number;
  maximumQuantity?: number;
  reorderLevel?: number;
  storageLocation?: string | null;
}

export interface StockAdjustInput {
  type: MovementType;
  quantity: number;
  reason?: string;
}

type ItemRow = Prisma.InventoryItemGetPayload<{ include: { _count: { select: { movements: true } } } }>;

function serialize(item: ItemRow) {
  const quantityAvailable = Number(item.quantityAvailable);
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    supplier: item.supplier,
    unit: item.unit,
    costPrice: Number(item.costPrice),
    sellingPrice: Number(item.sellingPrice),
    quantityAvailable,
    minimumQuantity: Number(item.minimumQuantity),
    maximumQuantity: Number(item.maximumQuantity),
    reorderLevel: Number(item.reorderLevel),
    storageLocation: item.storageLocation,
    lastRestocked: item.lastRestocked?.toISOString() ?? null,
    isActive: item.isActive,
    lowStock: quantityAvailable > 0 && quantityAvailable <= Number(item.reorderLevel),
    outOfStock: quantityAvailable <= 0,
    movementCount: item._count.movements,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

const itemInclude = { _count: { select: { movements: true } } } satisfies Prisma.InventoryItemInclude;

export async function listItems(query: InventoryListQuery, branchId: string | null) {
  const pagination = getPagination(query.page, query.pageSize);
  const where: Prisma.InventoryItemWhereInput = {};
  if (branchId) where.branchId = branchId;
  if (query.category) where.category = query.category;
  if (query.stock === "low" || query.stock === "out") {
    // Reorder level is per-item, so resolve matching ids first.
    const candidates = await prisma.inventoryItem.findMany({
      where: { ...(branchId ? { branchId } : {}) },
      select: { id: true, quantityAvailable: true, reorderLevel: true },
    });
    const ids = candidates
      .filter((i) => {
        const qty = Number(i.quantityAvailable);
        return query.stock === "out"
          ? qty <= 0
          : qty > 0 && qty <= Number(i.reorderLevel);
      })
      .map((i) => i.id);
    where.id = { in: ids };
  }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { sku: { contains: query.search, mode: "insensitive" } },
      { supplier: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const dir = query.sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.InventoryItemOrderByWithRelationInput =
    query.sortBy === "name" || query.sortBy === "quantityAvailable" || query.sortBy === "costPrice"
      ? { [query.sortBy]: dir }
      : { name: "asc" };

  const [rows, total] = await prisma.$transaction([
    prisma.inventoryItem.findMany({ where, orderBy, skip: pagination.skip, take: pagination.take, include: itemInclude }),
    prisma.inventoryItem.count({ where }),
  ]);

  return { data: rows.map(serialize), ...buildPageMeta(total, pagination) };
}

export async function getItem(id: string) {
  const item = await prisma.inventoryItem.findUnique({ where: { id }, include: itemInclude });
  if (!item) throw ApiError.notFound("Inventory item not found");
  return serialize(item);
}

export async function createItem(input: InventoryInput, branchId: string | null) {
  const item = await prisma.inventoryItem.create({
    data: {
      name: input.name!,
      sku: input.sku!,
      category: input.category ?? "CLEANING_CHEMICALS",
      supplier: input.supplier || null,
      unit: input.unit ?? "unit",
      costPrice: input.costPrice ?? 0,
      sellingPrice: input.sellingPrice ?? 0,
      quantityAvailable: input.quantityAvailable ?? 0,
      minimumQuantity: input.minimumQuantity ?? 0,
      maximumQuantity: input.maximumQuantity ?? 0,
      reorderLevel: input.reorderLevel ?? 0,
      storageLocation: input.storageLocation || null,
      branchId,
    },
    include: itemInclude,
  });
  return serialize(item);
}

export async function updateItem(id: string, input: InventoryInput) {
  const existing = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Inventory item not found");
  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.sku !== undefined && { sku: input.sku }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.supplier !== undefined && { supplier: input.supplier || null }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.costPrice !== undefined && { costPrice: input.costPrice }),
      ...(input.sellingPrice !== undefined && { sellingPrice: input.sellingPrice }),
      ...(input.quantityAvailable !== undefined && { quantityAvailable: input.quantityAvailable }),
      ...(input.minimumQuantity !== undefined && { minimumQuantity: input.minimumQuantity }),
      ...(input.maximumQuantity !== undefined && { maximumQuantity: input.maximumQuantity }),
      ...(input.reorderLevel !== undefined && { reorderLevel: input.reorderLevel }),
      ...(input.storageLocation !== undefined && { storageLocation: input.storageLocation || null }),
    },
    include: itemInclude,
  });
  return serialize(item);
}

export async function deleteItem(id: string): Promise<void> {
  const linked = await prisma.serviceInventoryRequirement.count({ where: { inventoryItemId: id } });
  if (linked > 0) {
    throw ApiError.conflict(
      "This item is linked to service requirements. Remove it from those services first.",
    );
  }
  await prisma.inventoryItem
    .delete({ where: { id } })
    .catch(() => {
      throw ApiError.notFound("Inventory item not found");
    });
}

/**
 * Apply a stock movement. RESTOCK adds, ISSUE/WRITE_OFF subtract, and
 * ADJUSTMENT sets the balance to the provided quantity.
 */
export async function adjustStock(
  id: string,
  input: StockAdjustInput,
  userId: string | undefined,
  branchId: string | null,
) {
  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) throw ApiError.notFound("Inventory item not found");

  const current = Number(item.quantityAvailable);
  let next: number;
  switch (input.type) {
    case "RESTOCK":
      next = current + input.quantity;
      break;
    case "ISSUE":
    case "WRITE_OFF":
      next = Math.max(0, current - input.quantity);
      break;
    case "ADJUSTMENT":
      next = input.quantity;
      break;
  }

  await prisma.$transaction(async (tx) => {
    await tx.inventoryMovement.create({
      data: {
        itemId: id,
        type: input.type,
        quantity: input.quantity,
        balanceAfter: next,
        reason: input.reason || null,
        createdById: userId,
        branchId,
      },
    });
    await tx.inventoryItem.update({
      where: { id },
      data: {
        quantityAvailable: next,
        lastRestocked: input.type === "RESTOCK" ? new Date() : item.lastRestocked,
      },
    });
  });

  await logAction({
    action: "INVENTORY_ADJUSTED",
    entity: "InventoryItem",
    entityId: id,
    userId,
    branchId: branchId ?? null,
    oldValue: { quantityAvailable: current },
    newValue: { quantityAvailable: next, type: input.type },
  });

  const isLow = next > 0 && next <= Number(item.reorderLevel);
  if (input.type === "ISSUE" || input.type === "WRITE_OFF" || (input.type === "ADJUSTMENT" && isLow)) {
    await createNotification({
      title: next <= 0 ? "Item out of stock" : "Low stock alert",
      message: `${item.name} is ${next <= 0 ? "out of stock" : "below the reorder level"} — ${next} ${item.unit} remaining`,
      type: next <= 0 ? "ERROR" : "WARNING",
      category: "INVENTORY",
      branchId,
    });
  }

  return getItem(id);
}

export async function listMovements(itemId: string) {
  const movements = await prisma.inventoryMovement.findMany({
    where: { itemId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { createdBy: { select: { fullName: true } } },
  });
  return movements.map((m) => ({
    id: m.id,
    type: m.type,
    quantity: Number(m.quantity),
    balanceAfter: Number(m.balanceAfter),
    reason: m.reason,
    createdByName: m.createdBy?.fullName ?? null,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function getStats(branchId: string | null) {
  const items = await prisma.inventoryItem.findMany({
    where: branchId ? { branchId } : {},
    select: {
      id: true,
      quantityAvailable: true,
      reorderLevel: true,
      costPrice: true,
      createdAt: true,
    },
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [monthlyRestocks] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where: { type: "RESTOCK", createdAt: { gte: monthStart }, ...(branchId ? { branchId } : {}) },
      select: { quantity: true, item: { select: { costPrice: true } } },
    }),
  ]);

  const totalValue = items.reduce(
    (sum, i) => sum + Number(i.quantityAvailable) * Number(i.costPrice),
    0,
  );
  const lowStock = items.filter((i) => Number(i.quantityAvailable) <= Number(i.reorderLevel));
  const recentlyAdded = items
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map((i) => i.id);

  return {
    totalValue,
    lowStockCount: lowStock.length,
    lowStockItems: lowStock.map((i) => i.id),
    outOfStockCount: items.filter((i) => Number(i.quantityAvailable) <= 0).length,
    recentlyAddedCount: recentlyAdded.length,
    monthlyPurchases: monthlyRestocks.reduce(
      (sum, m) => sum + Number(m.quantity) * Number(m.item.costPrice),
      0,
    ),
  };
}
