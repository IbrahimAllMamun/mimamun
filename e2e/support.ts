import { request, type APIRequestContext, type Page } from "@playwright/test";

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
  password:
    process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "local-admin-password-123",
};
export const ADMIN_STATE = "e2e/.auth/admin.json";

/**
 * An API client using the admin session created in global setup, for
 * arranging and cleaning up test data without clicking through the UI (and
 * without extra sign-ins, which are rate limited). Requests go through the
 * web origin, as the browser's do, so the API's Origin check passes.
 */
export async function adminApi(): Promise<{ api: APIRequestContext; csrf: string }> {
  const api = await request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { origin: BASE_URL },
    storageState: ADMIN_STATE,
  });
  const response = await api.get("/api/auth/session");
  if (!response.ok())
    throw new Error(`Admin session unavailable (${response.status()}): ${await response.text()}`);
  const body = (await response.json()) as { data: { csrfToken: string } };
  return { api, csrf: body.data.csrfToken };
}

/** Deletes a record through the admin API, ignoring "already gone". */
export async function deleteRecord(path: string, id: string) {
  const { api, csrf } = await adminApi();
  await api.delete(`/api/admin/${path}/${id}`, { headers: { "x-csrf-token": csrf } });
  await api.dispose();
}

export function uniqueTitle(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}`;
}

/** Collects console errors and uncaught exceptions for a page. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !/Failed to load resource: the server responded with a status of 404/.test(message.text())
    ) {
      errors.push(message.text());
    }
  });
  return errors;
}
