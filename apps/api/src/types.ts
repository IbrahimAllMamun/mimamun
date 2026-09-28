import type pg from "pg";
import type { Permission } from "@portfolio/shared";
import type { AppConfig } from "./config/env";
import type { Database } from "./database/client";
import type { GithubClient } from "./integrations/github/client";
import type { Mailer } from "./integrations/mailer";
import type { Revalidator } from "./integrations/revalidator";
import type { StorageDriver } from "./integrations/storage";
import type { Logger } from "./lib/logger";

/** Everything a router or service needs, created once in server.ts (or by tests). */
export interface AppDeps {
  config: AppConfig;
  db: Database;
  pool: pg.Pool;
  logger: Logger;
  storage: StorageDriver;
  mailer: Mailer;
  revalidator: Revalidator;
  github: GithubClient;
  startedAt: Date;
}

export interface AuthContext {
  sessionId: string;
  csrfToken: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
    roleId: string;
    roleKey: string;
    roleName: string;
  };
  permissions: Permission[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
      auth: AuthContext | null;
    }
  }
}
