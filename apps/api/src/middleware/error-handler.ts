import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import type { ApiFailure } from "@portfolio/shared";
import { AppError, notFound } from "../lib/errors";
import type { Logger } from "../lib/logger";

interface PgLikeError {
  code?: string;
  constraint?: string;
  detail?: string;
}

/** Drizzle wraps driver errors; the PostgreSQL error is on `cause`. */
function pgError(error: unknown): PgLikeError | null {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current; depth += 1) {
    const candidate = current as PgLikeError & { cause?: unknown };
    if (typeof candidate.code === "string" && /^[0-9A-Z]{5}$/.test(candidate.code))
      return candidate;
    current = candidate.cause;
  }
  return null;
}

const CONNECTION_ERRORS = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

function toAppError(error: unknown): AppError | null {
  if (error instanceof AppError) return error;
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE")
      return new AppError(413, "PAYLOAD_TOO_LARGE", "The file is larger than the allowed limit");
    return new AppError(400, "VALIDATION_ERROR", "Invalid upload");
  }
  const bodyError = error as { type?: string; status?: number };
  if (bodyError.type === "entity.too.large")
    return new AppError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  if (bodyError.type === "entity.parse.failed")
    return new AppError(400, "VALIDATION_ERROR", "Malformed JSON body");
  const pg = pgError(error);
  if (pg?.code === "23505")
    return new AppError(409, "CONFLICT", "A record with the same unique value already exists");
  if (pg?.code === "23503") {
    return new AppError(
      409,
      "CONFLICT",
      "This record is referenced by other content, or references something that does not exist",
    );
  }
  if (
    pg?.code === "23514" ||
    pg?.code === "22P02" ||
    pg?.code === "22007" ||
    pg?.code === "22008"
  ) {
    return new AppError(400, "VALIDATION_ERROR", "The data violates a validation rule");
  }
  if (pg?.code && (pg.code.startsWith("08") || pg.code === "57P01" || pg.code === "53300")) {
    return new AppError(503, "SERVICE_UNAVAILABLE", "The service is temporarily unavailable");
  }
  const code = (error as { code?: string }).code;
  if (code && CONNECTION_ERRORS.has(code)) {
    return new AppError(503, "SERVICE_UNAVAILABLE", "The service is temporarily unavailable");
  }
  return null;
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(notFound("Endpoint"));

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, _next) => {
    const appError = toAppError(error);
    const status = appError?.status ?? 500;
    if (status >= 500) {
      logger.error({ err: error, requestId: req.id, path: req.path }, "request failed");
    } else if (!appError) {
      logger.warn({ err: error, requestId: req.id }, "unclassified client error");
    }
    const body: ApiFailure = {
      success: false,
      error: appError
        ? {
            code: appError.code,
            message: appError.message,
            ...(appError.details ? { details: appError.details } : {}),
          }
        : {
            code: "INTERNAL_ERROR",
            message: "Something went wrong on our side. Please try again.",
          },
    };
    if (appError?.headers)
      for (const [key, value] of Object.entries(appError.headers)) res.setHeader(key, value);
    if (res.headersSent) return;
    res.status(status).json(body);
  };
}
