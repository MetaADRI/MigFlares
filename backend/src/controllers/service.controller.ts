import type { Request, Response } from "express";
import { created, ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as serviceService from "../services/service.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await serviceService.listServices(
    req.query as unknown as serviceService.ServiceListQuery,
    req.user?.branchId ?? null,
  );
  res.json(ok(result));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const service = await serviceService.getService(String(req.params.id));
  res.json(ok(service));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const service = await serviceService.createService(req.body, req.user?.branchId ?? null);
  res.status(201).json(created(service, "Service created"));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const service = await serviceService.updateService(String(req.params.id), req.body);
  res.json(ok(service, "Service updated"));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await serviceService.deleteService(String(req.params.id));
  res.json(ok(null, "Service deleted"));
});

export const duplicate = asyncHandler(async (req: Request, res: Response) => {
  const service = await serviceService.duplicateService(String(req.params.id));
  res.status(201).json(created(service, "Service duplicated"));
});

export const toggle = asyncHandler(async (req: Request, res: Response) => {
  const isActive = Boolean(req.body.isActive);
  const service = await serviceService.toggleService(String(req.params.id), isActive);
  res.json(ok(service, isActive ? "Service activated" : "Service deactivated"));
});
