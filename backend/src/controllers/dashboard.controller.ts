import type { Request, Response } from "express";
import { ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as dashboardService from "../services/dashboard.service.js";

export const stats = asyncHandler(async (req: Request, res: Response) => {
  const result = await dashboardService.getStats(req.user?.branchId ?? null);
  res.json(ok(result));
});

export const revenue = asyncHandler(async (req: Request, res: Response) => {
  const period = req.query.period === "month" ? "month" : "week";
  const result = await dashboardService.getRevenueSeries(period, req.user?.branchId ?? null);
  res.json(ok(result));
});

export const activities = asyncHandler(async (req: Request, res: Response) => {
  const result = await dashboardService.getActivities(req.user?.branchId ?? null);
  res.json(ok(result));
});

export const topServices = asyncHandler(async (req: Request, res: Response) => {
  const result = await dashboardService.getTopServices(req.user?.branchId ?? null);
  res.json(ok(result));
});

export const recentCustomers = asyncHandler(async (req: Request, res: Response) => {
  const result = await dashboardService.getRecentCustomers(req.user?.branchId ?? null);
  res.json(ok(result));
});

export const insights = asyncHandler(async (req: Request, res: Response) => {
  const result = await dashboardService.getInsights(req.user?.branchId ?? null);
  res.json(ok(result));
});
