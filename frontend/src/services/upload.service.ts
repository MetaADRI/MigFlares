import { api } from "./api";

interface UploadResponse {
  url: string;
  publicId: string;
}

/**
 * Upload a single image to Cloudinary through the backend API.
 * The server owns the Cloudinary credentials (server-side signing), so the
 * client only needs an authenticated session — no cloud-name or preset here.
 */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const { data } = await api.post<UploadResponse>("/upload", form);
  return data.url;
}
