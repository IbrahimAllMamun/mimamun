import type { IncomingMessage, ServerResponse } from "node:http";
import { pinoHttp } from "pino-http";
import type { Logger } from "../lib/logger";

/** Structured access log. Query strings are dropped (they may carry search terms or tokens). */
export function requestLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: (req: IncomingMessage) => (req as IncomingMessage & { id?: string }).id ?? "",
    autoLogging: { ignore: (req) => (req.url ?? "").startsWith("/api/health") },
    customLogLevel: (_req, res, error) => {
      if (error || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    serializers: {
      req: (req: IncomingMessage & { id?: string; raw?: IncomingMessage }) => ({
        id: req.id,
        method: req.method,
        path: (req.url ?? "").split("?")[0],
      }),
      res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
    },
    customProps: (req) => {
      const auth = (req as IncomingMessage & { auth?: { user: { id: string } } | null }).auth;
      return auth ? { userId: auth.user.id } : {};
    },
  });
}
