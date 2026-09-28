import type { Response } from "express";
import type { z } from "zod";
import type { FieldError } from "@portfolio/shared";
import { badRequest } from "./errors";

export function ok<T>(res: Response, data: T, meta?: unknown, status = 200): Response {
  return res.status(status).json(meta === undefined ? { success: true, data } : { success: true, data, meta });
}

export function created<T>(res: Response, data: T): Response {
  return ok(res, data, undefined, 201);
}

export function noContent(res: Response): Response {
  return res.status(204).end();
}

export function zodIssuesToFieldErrors(issues: readonly z.core.$ZodIssue[]): FieldError[] {
  return issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
}

/** Validates input against a schema, throwing a 400 VALIDATION_ERROR with field details. */
export function parse<S extends z.ZodType>(schema: S, input: unknown, message = "Invalid request"): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw badRequest(message, zodIssuesToFieldErrors(result.error.issues));
  return result.data;
}

/** ISO-8601 string or null for optional timestamps. */
export function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function isoRequired(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
