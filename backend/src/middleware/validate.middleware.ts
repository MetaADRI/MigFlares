import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodTypeAny } from "zod";
import { ApiError } from "../utils/api-error.js";

/**
 * Validate a request part against a Zod schema and replace it with the
 * parsed (transformed) output.
 */
export function validate(
  schema: ZodTypeAny,
  source: "body" | "query" | "params" = "body",
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const first = result.error.issues[0];
      next(ApiError.badRequest(first?.message ?? "Validation failed", result.error));
      return;
    }
    // Express 5 defines req.query (and friends) as getter-only accessors, so
    // Object.assign silently fails. Define an own property to shadow the accessor.
    Object.defineProperty(req, source, {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}
