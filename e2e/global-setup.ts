import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { request, type FullConfig } from "@playwright/test";
import { ADMIN, ADMIN_STATE } from "./support";

/**
 * Signs in once and stores the session for the admin tests. A stored session
 * that is still valid is reused, because sign-ins are rate limited.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3000";
  mkdirSync(path.dirname(ADMIN_STATE), { recursive: true });

  if (existsSync(ADMIN_STATE)) {
    const stored = await request.newContext({ baseURL, storageState: ADMIN_STATE });
    const session = await stored.get("/api/auth/session");
    await stored.dispose();
    if (session.ok()) return;
  }

  const context = await request.newContext({ baseURL, extraHTTPHeaders: { origin: baseURL } });
  const response = await context.post("/api/auth/login", { data: ADMIN });
  if (!response.ok()) {
    const hint =
      response.status() === 429
        ? "Sign-ins are rate limited; wait 15 minutes or restart the API."
        : "Is the database migrated and seeded, and are E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD correct?";
    throw new Error(`Could not sign in as ${ADMIN.email} (${response.status()}). ${hint}`);
  }
  await context.storageState({ path: ADMIN_STATE });
  await context.dispose();
}
