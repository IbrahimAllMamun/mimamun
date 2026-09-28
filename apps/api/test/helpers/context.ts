import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { sql } from "drizzle-orm";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../../src/app";
import { loadConfig, type AppConfig } from "../../src/config/env";
import { createDatabase } from "../../src/database/client";
import { seed } from "../../src/database/seed/index";
import { roles, users } from "../../src/database/schema";
import type { GithubClient, GithubRepositoryPayload } from "../../src/integrations/github/client";
import { MemoryMailer } from "../../src/integrations/mailer";
import { NoopRevalidator } from "../../src/integrations/revalidator";
import { LocalStorage } from "../../src/integrations/storage";
import { createLogger } from "../../src/lib/logger";
import { hashPassword } from "../../src/lib/password";
import type { AppDeps } from "../../src/types";
import { eq } from "drizzle-orm";
import { TEST_DATABASE_URL, TEST_ORIGIN } from "./env";

export class FakeGithubClient implements GithubClient {
  repositories: GithubRepositoryPayload[] = [];
  fail: Error | null = null;
  async listRepositories(): Promise<GithubRepositoryPayload[]> {
    if (this.fail) throw this.fail;
    return this.repositories;
  }
  async getLanguages(): Promise<Record<string, number>> {
    if (this.fail) throw this.fail;
    return { Python: 7000, R: 3000 };
  }
}

export interface TestContext {
  app: Express;
  deps: AppDeps;
  mailer: MemoryMailer;
  revalidator: NoopRevalidator;
  github: FakeGithubClient;
  uploadDir: string;
  close: () => Promise<void>;
}

export const ADMIN = { email: "admin@test.local", password: "admin-password-for-tests" };

export async function createTestContext(
  overrides: Partial<Record<string, string>> = {},
): Promise<TestContext> {
  const uploadDir = await mkdtemp(path.join(os.tmpdir(), "portfolio-uploads-"));
  const config: AppConfig = loadConfig({
    NODE_ENV: "test",
    DATABASE_URL: TEST_DATABASE_URL,
    APP_URL: TEST_ORIGIN,
    APP_SECRET: "test-secret-test-secret-test-secret-000",
    UPLOAD_DIR: uploadDir,
    JOBS_ENABLED: "false",
    LOG_LEVEL: "silent",
    ...overrides,
  });
  const database = createDatabase({ ...config.database, poolMax: 5 });
  const mailer = new MemoryMailer();
  const revalidator = new NoopRevalidator();
  const github = new FakeGithubClient();
  const deps: AppDeps = {
    config,
    db: database.db,
    pool: database.pool,
    logger: createLogger("silent"),
    storage: new LocalStorage(uploadDir),
    mailer,
    revalidator,
    github,
    startedAt: new Date(),
  };
  return {
    app: createApp(deps),
    deps,
    mailer,
    revalidator,
    github,
    uploadDir,
    close: async () => {
      await database.close();
      await rm(uploadDir, { recursive: true, force: true });
    },
  };
}

/** Empties every table and re-seeds, giving each test file a known starting point. */
export async function resetDatabase(deps: AppDeps): Promise<void> {
  const result = await deps.db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const tables = result.rows.map((row) => `"${row.tablename}"`).join(", ");
  if (tables) await deps.db.execute(sql.raw(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`));
  await seed(deps.db, {
    admin: { email: ADMIN.email, name: "Test Admin", password: ADMIN.password },
  });
}

export async function createUser(
  deps: AppDeps,
  roleKey: string,
  email: string,
  password = "user-password-for-tests",
): Promise<{ email: string; password: string; id: string }> {
  const [role] = await deps.db.select().from(roles).where(eq(roles.key, roleKey));
  if (!role) throw new Error(`role ${roleKey} missing`);
  const [user] = await deps.db
    .insert(users)
    .values({
      email,
      name: email.split("@")[0] ?? email,
      roleId: role.id,
      passwordHash: await hashPassword(password),
    })
    .returning();
  return { email, password, id: user!.id };
}

export interface Session {
  agent: ReturnType<typeof request.agent>;
  csrf: string;
  /** Headers for state-changing requests. */
  headers: Record<string, string>;
}

export async function login(
  app: Express,
  credentials: { email: string; password: string },
): Promise<Session> {
  const agent = request.agent(app);
  const response = await agent
    .post("/api/auth/login")
    .set("Origin", TEST_ORIGIN)
    .send(credentials)
    .expect(200);
  const csrf = response.body.data.csrfToken as string;
  return { agent, csrf, headers: { Origin: TEST_ORIGIN, "X-CSRF-Token": csrf } };
}
