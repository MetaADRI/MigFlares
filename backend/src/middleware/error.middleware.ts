import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(ApiError.notFound("Route not found"));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Known operational errors
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
    return;
  }

  // Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({
        success: false,
        message: "A record with that value already exists",
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ success: false, message: "Record not found" });
      return;
    }
  }

  // Unknown errors — log and return a safe message
  console.error("[unhandled error]", err);
  res.status(500).json({
    success: false,
    message: env.isProduction ? "Internal server error" : (err instanceof Error ? err.message : "Internal server error"),
  });
};
