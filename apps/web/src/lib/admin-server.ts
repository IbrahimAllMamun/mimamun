import "server-only";
import { cookies, headers } from "next/headers";
import type { SessionDTO } from "@portfolio/shared";
import { apiFetch } from "@/lib/api/server";

export { safeNext } from "@/lib/redirects";

/** The signed-in session, verified by the API (null when signed out or expired). */
export async function getSession(): Promise<SessionDTO | null> {
  const cookie = (await cookies()).toString();
  if (!cookie) return null;
  const result = await apiFetch<SessionDTO>("/api/auth/session", { noStore: true, cookie });
  return result.ok ? result.data : null;
}

/** The current path, set by the proxy for admin requests. */
export async function currentPath(): Promise<string> {
  return (await headers()).get("x-pathname") ?? "/admin";
}
