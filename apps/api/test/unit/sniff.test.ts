import { describe, expect, it } from "vitest";
import { detectFileType, pdfHasActiveContent, sanitizeFileName } from "../../src/modules/media/sniff";

const bytes = (...values: number[]) => Buffer.from(values);

describe("upload type detection", () => {
  it("identifies allowed formats by magic bytes", () => {
    expect(detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0))?.mime).toBe("image/jpeg");
    expect(detectFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.mime).toBe("image/png");
    expect(detectFileType(Buffer.from("RIFF\0\0\0\0WEBPVP8 "))?.mime).toBe("image/webp");
    expect(detectFileType(Buffer.from("\0\0\0\x20ftypavif"))?.mime).toBe("image/avif");
    expect(detectFileType(Buffer.from("\0\0\0\x20ftypisom"))?.kind).toBe("video");
    expect(detectFileType(bytes(0x1a, 0x45, 0xdf, 0xa3))?.mime).toBe("video/webm");
    expect(detectFileType(Buffer.from("%PDF-1.7\n"))?.mime).toBe("application/pdf");
  });

  it("rejects scriptable or unknown formats regardless of name", () => {
    expect(detectFileType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script/></svg>"))).toBeNull();
    expect(detectFileType(Buffer.from("<!doctype html><script>alert(1)</script>"))).toBeNull();
    expect(detectFileType(Buffer.from("GIF89a"))).toBeNull();
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
  });

  it("flags PDFs with active content", () => {
    expect(pdfHasActiveContent(Buffer.from("%PDF-1.4 1 0 obj << /S /JavaScript /JS (app.alert(1)) >>"))).toBe(true);
    expect(pdfHasActiveContent(Buffer.from("%PDF-1.4 << /Type /Action /S /Launch >>"))).toBe(true);
    expect(pdfHasActiveContent(Buffer.from("%PDF-1.4 << /Type /Catalog /Pages 2 0 R >>"))).toBe(false);
  });

  it("sanitises download names", () => {
    expect(sanitizeFileName("../../etc/passwd", "pdf")).toBe("passwd.pdf");
    expect(sanitizeFileName('My "CV" <2026>.PDF', "pdf")).toBe("My CV 2026.pdf");
    expect(sanitizeFileName("", "jpg")).toBe("file.jpg");
    expect(sanitizeFileName("photo.exe.jpg", "jpg")).toBe("photo.exe.jpg");
  });
});
