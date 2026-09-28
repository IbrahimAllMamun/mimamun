import type { MediaKind } from "@portfolio/shared";

export interface DetectedType {
  mime: string;
  ext: string;
  kind: MediaKind;
}

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

function ascii(buffer: Buffer, start: number, length: number): string {
  return buffer.subarray(start, start + length).toString("latin1");
}

/**
 * Identifies an upload from its leading bytes. The client-supplied MIME type and
 * file extension are ignored. Anything not on this allow-list is rejected —
 * notably SVG and HTML, which can carry scripts.
 */
export function detectFileType(buffer: Buffer): DetectedType | null {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg", kind: "image" };
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: "image/png", ext: "png", kind: "image" };
  }
  if (ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 4) === "WEBP") {
    return { mime: "image/webp", ext: "webp", kind: "image" };
  }
  if (ascii(buffer, 4, 4) === "ftyp") {
    const brand = ascii(buffer, 8, 4);
    if (brand === "avif" || brand === "avis") return { mime: "image/avif", ext: "avif", kind: "image" };
    if (["isom", "iso2", "mp41", "mp42", "avc1", "M4V ", "dash"].includes(brand)) {
      return { mime: "video/mp4", ext: "mp4", kind: "video" };
    }
    return null;
  }
  if (startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) return { mime: "video/webm", ext: "webm", kind: "video" };
  if (ascii(buffer, 0, 5) === "%PDF-") return { mime: "application/pdf", ext: "pdf", kind: "document" };
  return null;
}

/**
 * Rejects PDFs that declare active content in plain (uncompressed) objects.
 * Defence in depth only: objects inside compressed streams are not inspected.
 */
export function pdfHasActiveContent(buffer: Buffer): boolean {
  const text = buffer.toString("latin1");
  return /\/(JavaScript|Launch|EmbeddedFile|RichMedia|XFA)\b/.test(text) || /\/JS\s*[(<[]/.test(text);
}

/** Keeps a readable, safe download name: no paths, control characters or quotes. */
export function sanitizeFileName(original: string, ext: string): string {
  const base = original
    .split(/[\\/]/)
    .pop()!
    .normalize("NFKC")
    .replace(/\.[^.]*$/, "")
    .replace(/[\u0000-\u001f\u007f"'<>:|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `${base || "file"}.${ext}`;
}
