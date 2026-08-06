import type { Request, Response } from "express";
import { ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getSettings, updateSettings } from "../services/settings.service.js";
import { logAction } from "../services/audit.service.js";

export const get = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getSettings(req.user?.branchId ?? null);
  res.json(ok(settings));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const values = req.body as Record<string, string>;
  const settings = await updateSettings(values, req.user!.sub, req.user?.branchId ?? null);
  await logAction({
    action: "SETTINGS_UPDATED",
    entity: "Settings",
    userId: req.user?.sub,
    branchId: req.user?.branchId ?? null,
    newValue: values as unknown as Record<string, unknown>,
  });
  res.json(ok(settings, "Settings saved"));
});
