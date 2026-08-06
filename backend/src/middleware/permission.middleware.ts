import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../utils/api-error.js";

/**
 * Restrict a route to users holding one of the given permission keys.
 * Must be used after requireAuth (which attaches req.user.permissions).
 */
export function requirePermission(...permissions: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    const granted = req.user.permissions ?? [];
    if (!permissions.some((p) => granted.includes(p))) {
      next(ApiError.forbidden("You do not have permission to perform this action"));
      return;
    }
    next();
  };
}
