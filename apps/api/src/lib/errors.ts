import type { ErrorCode, FieldError } from "@portfolio/shared";

/** An error that maps directly to an API error response. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: FieldError[],
    public readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, details?: FieldError[]) =>
  new AppError(400, "VALIDATION_ERROR", message, details);
export const unauthenticated = (message = "Sign in to continue") =>
  new AppError(401, "UNAUTHENTICATED", message);
export const forbidden = (message = "You do not have permission to do this") =>
  new AppError(403, "FORBIDDEN", message);
export const notFound = (what = "Resource") => new AppError(404, "NOT_FOUND", `${what} not found`);
export const conflict = (message: string, details?: FieldError[]) =>
  new AppError(409, "CONFLICT", message, details);
export const payloadTooLarge = (message = "The upload is too large") =>
  new AppError(413, "PAYLOAD_TOO_LARGE", message);
export const unsupportedMediaType = (message: string) =>
  new AppError(415, "UNSUPPORTED_MEDIA_TYPE", message);
export const rateLimited = (message: string, retryAfterSeconds?: number) =>
  new AppError(
    429,
    "RATE_LIMITED",
    message,
    undefined,
    retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined,
  );
