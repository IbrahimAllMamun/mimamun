import type { RequestHandler } from "express";
import { AppError } from "../lib/errors";
import { safeEqual } from "../lib/crypto";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * CSRF defence for cookie-authenticated routes:
 *  1. state-changing requests must come from the site's own origin
 *     (Origin header, or Referer when a privacy tool strips Origin);
 *  2. when a session exists, the X-CSRF-Token header must match the token
 *     bound to that session (synchronizer token pattern).
 * SameSite=Lax cookies provide a third, independent layer.
 */
export function csrfProtection(allowedOrigin: string): RequestHandler {
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = originOf(req.header("origin")) ?? originOf(req.header("referer"));
    if (origin !== allowedOrigin) {
      return next(new AppError(403, "CSRF_INVALID", "Request origin not allowed"));
    }
    if (req.auth) {
      const token = req.header("x-csrf-token") ?? "";
      if (!token || !safeEqual(token, req.auth.csrfToken)) {
        return next(new AppError(403, "CSRF_INVALID", "Security token missing or expired. Reload the page and try again."));
      }
    }
    next();
  };
}
