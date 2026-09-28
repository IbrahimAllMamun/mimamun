import { parseCookie } from "cookie";
import type { RequestHandler } from "express";
import { loadSession } from "../modules/auth/sessions";
import type { AppDeps } from "../types";

/** Resolves the session cookie (if any) into `req.auth`. Never rejects on its own. */
export function sessionMiddleware(deps: Pick<AppDeps, "db" | "config">): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.cookie;
    if (!header) return next();
    const token = parseCookie(header)[deps.config.session.cookieName];
    if (!token) return next();
    try {
      req.auth = await loadSession(deps.db, deps.config.session, token);
      next();
    } catch (error) {
      next(error);
    }
  };
}
