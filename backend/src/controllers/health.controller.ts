import type { Request, Response } from "express";
import { ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { prisma } from "../config/database.js";

export const health = asyncHandler(async (_req: Request, res: Response) => {
  let database = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "unreachable";
  }
  res.json(
    ok({
      status: "ok",
      database,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  );
});
