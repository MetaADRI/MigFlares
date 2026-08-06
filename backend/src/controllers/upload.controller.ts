import type { Request, Response } from "express";
import { created } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { cloudinaryConfigured, uploadBuffer } from "../config/cloudinary.js";

/**
 * POST /api/upload — single image upload.
 * Phase 2: wash before/after photos and vehicle images are posted here and
 * the returned URL is stored on the record.
 */
export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw ApiError.badRequest("No image file provided");
  }
  if (!cloudinaryConfigured) {
    throw new ApiError(503, "Cloudinary is not configured. Set CLOUDINARY_* env vars.");
  }
  const result = await uploadBuffer(req.file.buffer, "wash-photos");
  res.status(201).json(created(result, "Image uploaded"));
});
