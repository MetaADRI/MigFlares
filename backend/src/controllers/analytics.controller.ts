import type { Request, Response } from "express";
import { ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getAnalyticsOverview } from "../services/analytics.service.js";

export const overview = asyncHandler(async (req: Request, res: Response) => {
  const analytics = await getAnalyticsOverview(req.user?.branchId ?? null);
  res.json(ok(analytics));
});
