import { ipKeyGenerator, rateLimit, type Options } from "express-rate-limit";
import type { Request } from "express";
import { rateLimited } from "../lib/errors";

interface LimitOptions {
  windowMs: number;
  limit: number;
  message: string;
  /** Extra key material (for example the submitted email) combined with the client IP. */
  key?: (req: Request) => string | null;
  /** Key only by `key(req)`, not by IP (e.g. per-account limits). */
  keyOnly?: boolean;
  skip?: Options["skip"];
  /** Count only failed requests (status >= 400), e.g. sign-in attempts. */
  skipSuccessfulRequests?: boolean;
}

/**
 * In-memory rate limiter returning the standard error envelope. A single API
 * instance is assumed; see docs/security.md for multi-instance deployments.
 */
export function createRateLimit(options: LimitOptions) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: options.skip,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    keyGenerator: (req) => {
      const ip = ipKeyGenerator(req.ip ?? "unknown");
      const extra = options.key?.(req) ?? null;
      if (options.keyOnly) return extra ?? ip;
      return extra ? `${ip}|${extra}` : ip;
    },
    handler: (_req, _res, next, opts) => {
      next(rateLimited(options.message, Math.ceil(opts.windowMs / 1000)));
    },
  });
}

export const minutes = (value: number) => value * 60 * 1000;
