import pino, { type Logger } from "pino";

/**
 * Structured JSON logging. Secrets and personal data are redacted at the
 * logger level so a careless log call cannot leak them.
 */
export const REDACT_PATHS = [
  "req.headers.cookie",
  "req.headers.authorization",
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  "*.password",
  "*.newPassword",
  "*.currentPassword",
  "*.passwordHash",
  "*.token",
  "*.csrfToken",
  "*.secret",
];

export function createLogger(level: string, pretty = false): Logger {
  return pino({
    level,
    redact: { paths: REDACT_PATHS, censor: "[redacted]" },
    base: { service: "portfolio-api" },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    ...(pretty
      ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } } }
      : {}),
  });
}

export type { Logger };
