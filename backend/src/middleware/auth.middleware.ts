import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { RoleName } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import { verifyAccessToken } from "../utils/token.js";

/** Verify the bearer token and attach the user payload to req.user. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Missing bearer token");
    }
    const payload = verifyAccessToken(header.slice(7));

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        isActive: true,
        branchId: true,
        role: {
          select: {
            name: true,
            isActive: true,
            permissions: true,
            rolePermissions: {
              select: { permission: { select: { key: true } } },
            },
          },
        },
      },
    });
    if (!user || !user.isActive) {
      throw ApiError.unauthorized("Account is disabled or no longer exists");
    }
    if (!user.role.isActive) {
      throw ApiError.unauthorized("Your role has been deactivated");
    }

    const permissionKeys = new Set<string>();
    for (const rp of user.role.rolePermissions) permissionKeys.add(rp.permission.key);
    for (const legacy of (user.role.permissions as string[] | null) ?? []) permissionKeys.add(legacy);

    req.user = {
      sub: user.id,
      username: user.username,
      role: user.role.name,
      branchId: user.branchId,
      permissions: [...permissionKeys],
    };
    next();
  } catch (error) {
    next(error);
  }
};

/** Restrict a route to specific roles. Must be used after requireAuth. */
export function requireRole(...roles: RoleName[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role as RoleName)) {
      next(ApiError.forbidden());
      return;
    }
    next();
  };
}
