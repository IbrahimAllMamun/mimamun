import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { REVALIDATE_SECRET } from "@/lib/env";

const ALLOWED_TAGS = new Set(["content"]);

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function secretMatches(provided: string | null): boolean {
  if (!REVALIDATE_SECRET || !provided) return false;
  return timingSafeEqual(digest(provided), digest(REVALIDATE_SECRET));
}

/**
 * Called by the API after content changes. Cached public data is expired
 * immediately (`expire: 0`) so an editor who publishes and then opens the page
 * sees the new version; the next visitor pays for one uncached render.
 * The reverse proxy should not expose `/internal/*`; the shared secret is the
 * second line of defence.
 */
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-revalidate-secret"))) {
    return Response.json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
  }
  let tags: string[] = ["content"];
  try {
    const body = (await request.json()) as { tags?: unknown };
    if (Array.isArray(body.tags)) tags = body.tags.filter((tag): tag is string => typeof tag === "string");
  } catch {
    // An empty or malformed body revalidates the default tag.
  }
  const accepted = tags.filter((tag) => ALLOWED_TAGS.has(tag));
  for (const tag of accepted) revalidateTag(tag, { expire: 0 });
  return Response.json({ success: true, data: { revalidated: accepted } }, { headers: { "cache-control": "no-store" } });
}
