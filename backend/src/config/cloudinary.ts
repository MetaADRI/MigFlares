import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

/**
 * Cloudinary setup. Uploads are wired end-to-end but intentionally gated:
 * when credentials are absent the upload route returns 503 so the scaffold
 * stays runnable without external accounts.
 */
cloudinary.config({
  cloud_name: env.cloudinary.cloudName ?? undefined,
  api_key: env.cloudinary.apiKey ?? undefined,
  api_secret: env.cloudinary.apiSecret ?? undefined,
  secure: true,
});

export const cloudinaryConfigured = Boolean(
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret,
);

export interface UploadResult {
  url: string;
  publicId: string;
}

/** Upload a single image buffer to Cloudinary. */
export function uploadBuffer(buffer: Buffer, folder: string): Promise<UploadResult> {
  if (!cloudinaryConfigured) {
    return Promise.reject(new Error("Cloudinary is not configured. Set CLOUDINARY_* env vars."));
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.cloudinary.folder}/${folder}`,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}
