import type { Prisma, VehicleStatus, VehicleType } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";

export interface VehicleListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  vehicleType?: VehicleType;
  status?: VehicleStatus;
  customerId?: string;
}

export interface VehicleInput {
  plateNumber?: string;
  make?: string;
  model?: string;
  year?: number | null;
  color?: string;
  vehicleType?: VehicleType;
  customerId?: string;
}

const vehicleInclude = {
  customer: true,
  _count: { select: { washRecords: true } },
} satisfies Prisma.VehicleInclude;

type VehicleRow = Prisma.VehicleGetPayload<{ include: typeof vehicleInclude }>;

function serialize(vehicle: VehicleRow) {
  return {
    id: vehicle.id,
    plateNumber: vehicle.plateNumber,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    vehicleType: vehicle.vehicleType,
    imageUrl: vehicle.imageUrl,
    customerId: vehicle.customerId,
    ownerName: `${vehicle.customer.firstName} ${vehicle.customer.lastName}`,
    status: vehicle.status,
    washCount: vehicle._count.washRecords,
    lastWashAt: vehicle.lastWashAt?.toISOString() ?? null,
    createdAt: vehicle.createdAt.toISOString(),
  };
}

export async function listVehicles(query: VehicleListQuery, branchId: string | null) {
  const pagination = getPagination(query.page, query.pageSize);
  const where: Prisma.VehicleWhereInput = {};
  if (branchId) where.branchId = branchId;
  if (query.vehicleType) where.vehicleType = query.vehicleType;
  if (query.status) where.status = query.status;
  if (query.customerId) where.customerId = query.customerId;
  if (query.search) {
    where.OR = [
      { plateNumber: { contains: query.search, mode: "insensitive" } },
      { make: { contains: query.search, mode: "insensitive" } },
      { model: { contains: query.search, mode: "insensitive" } },
      { customer: { OR: [
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
      ] } },
    ];
  }

  const [rows, total] = await prisma.$transaction([
    prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
      include: vehicleInclude,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return { data: rows.map(serialize), ...buildPageMeta(total, pagination) };
}

export async function getVehicle(id: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: vehicleInclude,
  });
  if (!vehicle) throw ApiError.notFound("Vehicle not found");
  return serialize(vehicle);
}

export async function createVehicle(input: VehicleInput) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId! } });
  if (!customer) throw ApiError.badRequest("Customer not found");
  const vehicle = await prisma.vehicle.create({
    data: {
      plateNumber: input.plateNumber!,
      make: input.make!,
      model: input.model!,
      year: input.year ?? null,
      color: input.color!,
      vehicleType: input.vehicleType ?? "SEDAN",
      customerId: customer.id,
    },
    include: vehicleInclude,
  });
  return serialize(vehicle);
}

export async function updateVehicle(id: string, input: VehicleInput) {
  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Vehicle not found");
  if (input.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw ApiError.badRequest("Customer not found");
  }
  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      ...(input.plateNumber !== undefined && { plateNumber: input.plateNumber }),
      ...(input.make !== undefined && { make: input.make }),
      ...(input.model !== undefined && { model: input.model }),
      ...(input.year !== undefined && { year: input.year }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.vehicleType !== undefined && { vehicleType: input.vehicleType }),
      ...(input.customerId !== undefined && { customerId: input.customerId }),
    },
    include: vehicleInclude,
  });
  return serialize(vehicle);
}

export async function deleteVehicle(id: string): Promise<void> {
  await prisma.vehicle
    .delete({ where: { id } })
    .catch(() => {
      throw ApiError.notFound("Vehicle not found");
    });
}
