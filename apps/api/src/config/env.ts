import path from "node:path";
import { z } from "zod";

/**
 * Environment configuration, validated once at startup. The process refuses to
 * start with a clear message when a required variable is missing or invalid.
 * See docs/environment.md for descriptions of every variable.
 */

const bool = (fallback: boolean) =>
  z
    .enum(["true", "false", "1", "0", ""])
    .optional()
    .transform((value) =>
      value === undefined || value === "" ? fallback : value === "true" || value === "1",
    );

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : null));

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().default("0.0.0.0"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.string().min(1, { error: "DATABASE_URL is required" }),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    DATABASE_SSL: z.enum(["disable", "require", "no-verify"]).default("disable"),
    APP_URL: z.url().default("http://localhost:3000"),
    APP_SECRET: z.string().optional(),
    TRUST_PROXY: z.string().default("loopback, linklocal, uniquelocal"),
    SESSION_COOKIE_NAME: optionalString,
    SESSION_TTL_HOURS: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 90)
      .default(24 * 7),
    SESSION_IDLE_TIMEOUT_HOURS: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 30)
      .default(12),
    COOKIE_SECURE: z.enum(["true", "false", ""]).optional(),
    LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(50).default(5),
    LOGIN_LOCKOUT_MINUTES: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .default(15),
    // An empty value (as in .env.example) means "use the default for NODE_ENV".
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent", ""])
      .optional()
      .transform((value) => value || undefined),
    UPLOAD_DIR: z.string().default("uploads"),
    UPLOAD_MAX_IMAGE_MB: z.coerce.number().min(1).max(50).default(10),
    UPLOAD_MAX_DOCUMENT_MB: z.coerce.number().min(1).max(100).default(20),
    UPLOAD_MAX_VIDEO_MB: z.coerce.number().min(1).max(500).default(100),
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: bool(false),
    SMTP_USER: optionalString,
    SMTP_PASSWORD: optionalString,
    MAIL_FROM: optionalString,
    GITHUB_TOKEN: optionalString,
    GITHUB_API_URL: z.url().default("https://api.github.com"),
    GITHUB_SYNC_INTERVAL_MINUTES: z.coerce
      .number()
      .int()
      .min(15)
      .max(24 * 60 * 7)
      .default(360),
    WEB_INTERNAL_URL: optionalString,
    REVALIDATE_SECRET: optionalString,
    ANALYTICS_COUNTRY_HEADER: optionalString,
    JOBS_ENABLED: bool(true),
    APP_VERSION: z.string().default(process.env.npm_package_version ?? "1.0.0"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (!env.APP_SECRET || env.APP_SECRET.length < 32) {
        ctx.addIssue({
          code: "custom",
          path: ["APP_SECRET"],
          message: "APP_SECRET must be set to at least 32 random characters in production",
        });
      }
      if (!env.APP_URL.startsWith("https://")) {
        ctx.addIssue({
          code: "custom",
          path: ["APP_URL"],
          message: "APP_URL must use https in production",
        });
      }
    }
    if (env.SMTP_HOST && !env.MAIL_FROM) {
      ctx.addIssue({
        code: "custom",
        path: ["MAIL_FROM"],
        message: "MAIL_FROM is required when SMTP_HOST is set",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export interface AppConfig {
  env: Env["NODE_ENV"];
  isProduction: boolean;
  isTest: boolean;
  version: string;
  host: string;
  port: number;
  appUrl: string;
  appOrigin: string;
  appSecret: string;
  trustProxy: string | number | boolean;
  database: { url: string; poolMax: number; ssl: Env["DATABASE_SSL"] };
  session: {
    cookieName: string;
    cookieSecure: boolean;
    ttlHours: number;
    idleTimeoutHours: number;
  };
  login: { maxAttempts: number; lockoutMinutes: number };
  logLevel: NonNullable<Env["LOG_LEVEL"]>;
  uploads: { dir: string; maxImageBytes: number; maxDocumentBytes: number; maxVideoBytes: number };
  mail: {
    host: string | null;
    port: number;
    secure: boolean;
    user: string | null;
    password: string | null;
    from: string | null;
  };
  github: { token: string | null; apiUrl: string; syncIntervalMinutes: number };
  web: { internalUrl: string | null; revalidateSecret: string | null };
  analytics: { countryHeader: string | null };
  jobsEnabled: boolean;
}

const DEV_SECRET = "development-only-secret-do-not-use-in-production-000";

function parseTrustProxy(value: string): string | number | boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  const env = parsed.data;
  const isProduction = env.NODE_ENV === "production";
  const cookieSecure = env.COOKIE_SECURE ? env.COOKIE_SECURE === "true" : isProduction;
  const mb = 1024 * 1024;
  return {
    env: env.NODE_ENV,
    isProduction,
    isTest: env.NODE_ENV === "test",
    version: env.APP_VERSION,
    host: env.HOST,
    port: env.PORT,
    appUrl: env.APP_URL.replace(/\/$/, ""),
    appOrigin: new URL(env.APP_URL).origin,
    appSecret: env.APP_SECRET ?? DEV_SECRET,
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    database: { url: env.DATABASE_URL, poolMax: env.DATABASE_POOL_MAX, ssl: env.DATABASE_SSL },
    session: {
      // The __Host- prefix forces Secure, Path=/ and no Domain attribute.
      cookieName:
        env.SESSION_COOKIE_NAME ??
        (cookieSecure ? "__Host-portfolio_session" : "portfolio_session"),
      cookieSecure,
      ttlHours: env.SESSION_TTL_HOURS,
      idleTimeoutHours: env.SESSION_IDLE_TIMEOUT_HOURS,
    },
    login: { maxAttempts: env.LOGIN_MAX_ATTEMPTS, lockoutMinutes: env.LOGIN_LOCKOUT_MINUTES },
    logLevel:
      env.LOG_LEVEL ?? (env.NODE_ENV === "test" ? "silent" : isProduction ? "info" : "debug"),
    uploads: {
      dir: path.resolve(env.UPLOAD_DIR),
      maxImageBytes: env.UPLOAD_MAX_IMAGE_MB * mb,
      maxDocumentBytes: env.UPLOAD_MAX_DOCUMENT_MB * mb,
      maxVideoBytes: env.UPLOAD_MAX_VIDEO_MB * mb,
    },
    mail: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      from: env.MAIL_FROM,
    },
    github: {
      token: env.GITHUB_TOKEN,
      apiUrl: env.GITHUB_API_URL.replace(/\/$/, ""),
      syncIntervalMinutes: env.GITHUB_SYNC_INTERVAL_MINUTES,
    },
    web: { internalUrl: env.WEB_INTERNAL_URL, revalidateSecret: env.REVALIDATE_SECRET },
    analytics: { countryHeader: env.ANALYTICS_COUNTRY_HEADER?.toLowerCase() ?? null },
    jobsEnabled: env.JOBS_ENABLED,
  };
}
