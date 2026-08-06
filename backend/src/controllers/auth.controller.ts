import type { Request, Response } from "express";
import { created, ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as authService from "../services/auth.service.js";
import { logAction } from "../services/audit.service.js";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.registerOwner(req.body);
  res.status(201).json(created(user, "Owner account created"));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body.username, req.body.password);
  await logAction({
    action: "LOGIN",
    entity: "Auth",
    userId: result.user.id,
    branchId: req.user?.branchId ?? null,
    details: { username: req.body.username },
  });
  res.json(ok(result));
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refreshTokens(req.body.refreshToken);
  res.json(ok(result));
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    await authService.logout(req.user.sub);
    await logAction({
      action: "LOGOUT",
      entity: "Auth",
      userId: req.user.sub,
      branchId: req.user.branchId ?? null,
    });
  }
  res.json(ok(null, "Logged out"));
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.sub);
  res.json(ok(user));
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateProfile(req.user!.sub, req.body);
  await logAction({
    action: "PROFILE_UPDATED",
    entity: "User",
    entityId: user.id,
    userId: req.user?.sub,
    branchId: req.user?.branchId ?? null,
    newValue: req.body as Record<string, unknown>,
  });
  res.json(ok(user, "Profile updated"));
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(req.user!.sub, req.body.currentPassword, req.body.newPassword);
  await logAction({
    action: "PASSWORD_CHANGED",
    entity: "User",
    entityId: req.user?.sub,
    userId: req.user?.sub,
    branchId: req.user?.branchId ?? null,
  });
  res.json(ok(null, "Password changed"));
});

export const loginHistory = asyncHandler(async (req: Request, res: Response) => {
  res.json(ok(await authService.recentLogins(req.user!.sub)));
});
