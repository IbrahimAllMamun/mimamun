import "server-only";
import { cookies, headers } from "next/headers";
import type { SessionDTO } from "@portfolio/shared";
import { apiFetch } from "@/lib/api/server";

/** The signed-in session, verified by the API (null when signed out or expired). */
export async function getSession(): Promise<SessionDTO | null> {
  const cookie = (await cookies()).toString();
  if (!cookie) return null;
  const result = await apiFetch<SessionDTO>("/api/auth/session", { noStore: true, cookie });
  return result.ok ? result.data : null;
}

/** Only same-site admin or preview paths are allowed as post-login targets. */
export function safeNext(value: string | string[] | undefined | null): string {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !/^\/(admin|preview)(\/|$|\?)/.test(next) || next.startsWith("//") || next.includes("\\")) return "/admin";
  if (/^\/admin\/(login|forgot-password|reset-password)/.test(next)) return "/admin";
  return next;
}

/** The current path, set by the proxy for admin requests. */
export async function currentPath(): Promise<string> {
  return (await headers()).get("x-pathname") ?? "/admin";
}
