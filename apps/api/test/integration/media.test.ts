import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN, createTestContext, createUser, login, resetDatabase, type Session, type TestContext } from "../helpers/context";

let ctx: TestContext;
let admin: Session;

async function jpegWithExif(): Promise<Buffer> {
  return sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#1F5A44" } })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Copyright: "SECRET-LOCATION-DATA" } } })
    .toBuffer();
}

beforeAll(async () => {
  ctx = await createTestContext({ UPLOAD_MAX_IMAGE_MB: "1", UPLOAD_MAX_DOCUMENT_MB: "1" });
  await resetDatabase(ctx.deps);
  admin = await login(ctx.app, ADMIN);
});
afterAll(() => ctx.close());

describe("media uploads", () => {
  let imageId: string;
  let imageUrl: string;

  it("accepts an image, strips metadata and downsizes it", async () => {
    const response = await admin.agent
      .post("/api/admin/media")
      .set(admin.headers)
      .field("altText", "A green square")
      .attach("file", await jpegWithExif(), { filename: "../../photo.jpg", contentType: "image/jpeg" })
      .expect(201);
    const item = response.body.data;
    imageId = item.id;
    imageUrl = item.url;
    expect(item).toMatchObject({ kind: "image", mimeType: "image/jpeg", width: 3200, height: 2400, alt: "A green square", fileName: "photo.jpg" });
    expect(item.url).toMatch(/^\/media\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.jpg$/);
    const served = await request(ctx.app).get(item.url).expect(200);
    expect(Buffer.from(served.body).includes(Buffer.from("SECRET-LOCATION-DATA"))).toBe(false);
    expect(served.headers["x-content-type-options"]).toBe("nosniff");
    expect(served.headers["content-security-policy"]).toContain("sandbox");
    expect(served.headers["cache-control"]).toContain("immutable");
  });

  it("serves byte ranges and conditional requests", async () => {
    const partial = await request(ctx.app).get(imageUrl).set("Range", "bytes=0-99").expect(206);
    expect(partial.headers["content-range"]).toMatch(/^bytes 0-99\/\d+$/);
    const etag = partial.headers.etag;
    await request(ctx.app).get(imageUrl).set("If-None-Match", etag).expect(304);
    await request(ctx.app).get(imageUrl).set("Range", "bytes=999999999-").expect(416);
  });

  it("rejects disguised, scriptable and oversized files", async () => {
    const html = await admin.agent
      .post("/api/admin/media")
      .set(admin.headers)
      .attach("file", Buffer.from("<html><script>alert(1)</script></html>"), { filename: "cat.jpg", contentType: "image/jpeg" })
      .expect(415);
    expect(html.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    await admin.agent
      .post("/api/admin/media")
      .set(admin.headers)
      .attach("file", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), { filename: "logo.svg", contentType: "image/svg+xml" })
      .expect(415);
    await admin.agent
      .post("/api/admin/media")
      .set(admin.headers)
      .attach("file", Buffer.from("%PDF-1.4\n1 0 obj << /S /JavaScript /JS (app.alert(1)) >>"), { filename: "cv.pdf", contentType: "application/pdf" })
      .expect(415);
    const big = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(1_200_000, 32)]);
    const tooLarge = await admin.agent
      .post("/api/admin/media")
      .set(admin.headers)
      .attach("file", big, { filename: "big.pdf", contentType: "application/pdf" })
      .expect(413);
    expect(tooLarge.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("tracks usage and refuses to delete files in use", async () => {
    await admin.agent
      .post("/api/admin/projects")
      .set(admin.headers)
      .send({ title: "Uses image", summary: "Cover test", coverMediaId: imageId })
      .expect(201);
    const detail = await admin.agent.get(`/api/admin/media/${imageId}`).expect(200);
    expect(detail.body.data.usage).toEqual([expect.objectContaining({ entityType: "project", field: "Cover", label: "Uses image" })]);
    const refused = await admin.agent.delete(`/api/admin/media/${imageId}`).set(admin.headers).expect(409);
    expect(refused.body.error.details[0].message).toContain("Uses image");
  });

  it("replaces a file in place, keeping its id and changing its URL", async () => {
    const png = await sharp({ create: { width: 10, height: 10, channels: 4, background: "#5A3A6E" } }).png().toBuffer();
    await admin.agent
      .post(`/api/admin/media/${imageId}/replace`)
      .set(admin.headers)
      .attach("file", Buffer.from("%PDF-1.4\n"), { filename: "x.pdf", contentType: "application/pdf" })
      .expect(415);
    const replaced = await admin.agent
      .post(`/api/admin/media/${imageId}/replace`)
      .set(admin.headers)
      .attach("file", png, { filename: "new.png", contentType: "image/png" })
      .expect(200);
    expect(replaced.body.data.id).toBe(imageId);
    expect(replaced.body.data.url).not.toBe(imageUrl);
    await request(ctx.app).get(imageUrl).expect(404);
    await request(ctx.app).get(replaced.body.data.url).expect(200);
  });

  it("deletes unused files", async () => {
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#C25A24" } }).png().toBuffer();
    const upload = await admin.agent.post("/api/admin/media").set(admin.headers).attach("file", png, "dot.png").expect(201);
    await admin.agent.delete(`/api/admin/media/${upload.body.data.id}`).set(admin.headers).expect(204);
    await request(ctx.app).get(upload.body.data.url).expect(404);
  });

  it("requires media permission", async () => {
    const writer = await admin.agent
      .post("/api/admin/roles")
      .set(admin.headers)
      .send({ key: "NOMEDIA", name: "No media", permissions: ["content:read", "content:write"] })
      .expect(201);
    expect(writer.status).toBe(201);
    const session = await login(ctx.app, await createUser(ctx.deps, "NOMEDIA", "nomedia@test.local"));
    await session.agent.get("/api/admin/media").expect(403);
  });
});
