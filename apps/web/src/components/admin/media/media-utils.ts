import type { AdminMediaDTO, MediaAccept, MediaKind } from "@portfolio/shared";
import { apiRequest, type ClientResult } from "@/lib/api/client";

export const ACCEPT_TYPES: Record<MediaAccept, string> = {
  image: "image/jpeg,image/png,image/webp,image/avif",
  document: "application/pdf",
  video: "video/mp4,video/webm",
  any: "image/jpeg,image/png,image/webp,image/avif,application/pdf,video/mp4,video/webm",
};

export const ACCEPT_LABELS: Record<MediaAccept, string> = {
  image: "JPEG, PNG, WebP or AVIF",
  document: "PDF",
  video: "MP4 or WebM",
  any: "images, PDFs or videos",
};

export function kindFilter(accept: MediaAccept): MediaKind | null {
  return accept === "any" ? null : accept;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function uploadMedia(file: File, fields: { altText?: string; title?: string; caption?: string } = {}): Promise<ClientResult<AdminMediaDTO>> {
  const body = new FormData();
  body.set("file", file);
  for (const [key, value] of Object.entries(fields)) if (value) body.set(key, value);
  return apiRequest<AdminMediaDTO>("POST", "/api/admin/media", body);
}
