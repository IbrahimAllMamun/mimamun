import express, { type Express, type RequestHandler } from "express";
import { adminRouter } from "./modules/admin";
import { analyticsIngestRouter } from "./modules/analytics/routes";
import { authRouter } from "./modules/auth/routes";
import { contactPublicRouter } from "./modules/contact/routes";
import { healthRouter } from "./modules/health/routes";
import { mediaFileRouter } from "./modules/media/serve";
import { cvRouter, publicRouter } from "./modules/public/routes";
import { csrfProtection } from "./middleware/csrf";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { requestContext } from "./middleware/request-context";
import { requestLogger } from "./middleware/request-logger";
import { securityHeaders } from "./middleware/security-headers";
import { sessionMiddleware } from "./middleware/session";
import type { AppDeps } from "./types";

const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
};

/**
 * Builds the Express application from its dependencies. No network listeners,
 * timers or process hooks are created here, so tests can use it directly.
 */
export function createApp(deps: AppDeps): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", deps.config.trustProxy);
  app.set("query parser", "simple");

  app.use(requestContext);
  app.use(requestLogger(deps.logger));
  app.use(securityHeaders);

  app.use("/api/health", healthRouter(deps));
  app.use("/media", mediaFileRouter(deps));

  app.use(express.json({ limit: "2mb", strict: true }));
  app.use(sessionMiddleware(deps));

  app.use("/cv", cvRouter(deps));
  app.use("/api/public", publicRouter(deps));
  app.use("/api/public", contactPublicRouter(deps));
  app.use("/api/analytics", analyticsIngestRouter(deps));

  const csrf = csrfProtection(deps.config.appOrigin);
  app.use("/api/auth", noStore, csrf, authRouter(deps));
  app.use("/api/admin", noStore, csrf, adminRouter(deps));

  app.use(notFoundHandler);
  app.use(errorHandler(deps.logger));
  return app;
}
