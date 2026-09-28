import type { RequestHandler } from "express";
import type { Permission } from "@portfolio/shared";
import { forbidden, unauthenticated } from "../lib/errors";

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.auth) return next(unauthenticated());
  next();
};

/** Requires every listed permission. Always enforced server-side. */
export function requirePermission(...permissions: Permission[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(unauthenticated());
    const missing = permissions.filter((permission) => !req.auth?.permissions.includes(permission));
    if (missing.length) return next(forbidden());
    next();
  };
}

/** Requires at least one of the listed permissions. */
export function requireAnyPermission(...permissions: Permission[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(unauthenticated());
    if (!permissions.some((permission) => req.auth?.permissions.includes(permission))) return next(forbidden());
    next();
  };
}
