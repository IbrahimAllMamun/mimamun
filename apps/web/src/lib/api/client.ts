"use client";

import type { ApiErrorBody, FieldError } from "@portfolio/shared";

export type ClientResult<T, M = unknown> =
  { ok: true; data: T; meta: M } | { ok: false; status: number; error: ApiErrorBody };

let csrfToken: string | null = null;

/** Set by the admin shell from the server-verified session. */
export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

/**
 * Same-origin JSON request from the browser. Cookies are sent automatically;
 * the CSRF token is attached to every state-changing request.
 */
export async function apiRequest<T, M = unknown>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<ClientResult<T, M>> {
  const headers: Record<string, string> = { accept: "application/json" };
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["content-type"] = "application/json";
  if (method !== "GET" && csrfToken) headers["x-csrf-token"] = csrfToken;
  try {
    const response = await fetch(path, {
      method,
      headers,
      credentials: "same-origin",
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
    if (response.status === 204) return { ok: true, data: undefined as T, meta: undefined as M };
    const payload = (await response.json().catch(() => null)) as
      { success: true; data: T; meta?: M } | { success: false; error: ApiErrorBody } | null;
    if (!response.ok || !payload || !payload.success) {
      return {
        ok: false,
        status: response.status,
        error:
          payload && !payload.success
            ? payload.error
            : {
                code: "INTERNAL_ERROR",
                message: `The request failed (${response.status}). Please try again.`,
              },
      };
    }
    return { ok: true, data: payload.data, meta: payload.meta as M };
  } catch {
    return {
      ok: false,
      status: 0,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "You appear to be offline, or the server is unreachable.",
      },
    };
  }
}

/** Maps API field errors to a `{ path: message }` record for inline display. */
export function fieldErrors(details: FieldError[] | undefined): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const detail of details ?? []) {
    if (!errors[detail.path]) errors[detail.path] = detail.message;
  }
  return errors;
}
