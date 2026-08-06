import type { Request, Response } from "express";
import { created, ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as vehicleService from "../services/vehicle.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await vehicleService.listVehicles(
    req.query as unknown as vehicleService.VehicleListQuery,
    req.user?.branchId ?? null,
  );
  res.json(ok(result));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await vehicleService.getVehicle(String(req.params.id));
  res.json(ok(vehicle));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await vehicleService.createVehicle(req.body);
  res.status(201).json(created(vehicle, "Vehicle registered"));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await vehicleService.updateVehicle(String(req.params.id), req.body);
  res.json(ok(vehicle, "Vehicle updated"));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await vehicleService.deleteVehicle(String(req.params.id));
  res.json(ok(null, "Vehicle deleted"));
});
