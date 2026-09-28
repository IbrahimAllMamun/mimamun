import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

/** Assigns a request id (reusing a well-formed upstream one) and resets auth state. */
export const requestContext: RequestHandler = (req, res, next) => {
  const incoming = req.header("x-request-id");
  req.id = incoming && REQUEST_ID.test(incoming) ? incoming : randomUUID();
  req.auth = null;
  res.setHeader("X-Request-Id", req.id);
  next();
};
