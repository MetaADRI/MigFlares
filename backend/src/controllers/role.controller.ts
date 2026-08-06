import type { Request, Response } from "express";
import { created, ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as roleService from "../services/role.service.js";
import { logAction } from "../services/audit.service.js";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json(ok(await roleService.listRoles()));
});

export const permissions = asyncHandler(async (_req: Request, res: Response) => {
  res.json(ok(await roleService.listPermissions()));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const role = await roleService.createRole(req.body);
  await logAction({
    action: "ROLE_CREATED",
    entity: "Role",
    entityId: role.id,
    userId: req.user?.sub,
    branchId: req.user?.branchId ?? null,
    newValue: { name: role.name },
  });
  res.status(201).json(created(role, "Role created"));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const role = await roleService.updateRole(String(req.params.id), req.body);
  await logAction({
    action: "ROLE_UPDATED",
    entity: "Role",
    entityId: role.id,
    userId: req.user?.sub,
    branchId: req.user?.branchId ?? null,
    newValue: { name: role.name, permissions: role.permissions },
  });
  res.json(ok(role, "Role updated"));
});

export const toggle = asyncHandler(async (req: Request, res: Response) => {
  const role = await roleService.toggleRole(String(req.params.id), Boolean(req.body.isActive));
  res.json(ok(role, role.isActive ? "Role activated" : "Role deactivated"));
});

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  res.json(ok(await roleService.listUsers()));
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await roleService.createUser(req.body);
  await logAction({
    action: "USER_CREATED",
    entity: "User",
    entityId: user.id,
    userId: req.user?.sub,
    branchId: req.user?.branchId ?? null,
    newValue: { username: user.username, fullName: user.fullName, role: user.roleName },
  });
  res.status(201).json(created(user, "User created"));
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const updated = await roleService.updateUser(String(req.params.id), req.body, req.user?.sub);
  await logAction({
    action: "USER_UPDATED",
    entity: "User",
    entityId: updated.id,
    userId: req.user?.sub,
    branchId: req.user?.branchId ?? null,
    newValue: {
      username: updated.username,
      fullName: updated.fullName,
      role: updated.roleName,
      isActive: updated.isActive,
      ...(req.body.password ? { passwordReset: true } : {}),
    },
  });
  res.json(ok(updated, "User updated"));
});

export const setUserRole = asyncHandler(async (req: Request, res: Response) => {
  const updated = await roleService.setUserRole(String(req.params.id), String(req.body.roleId));
  await logAction({
    action: "USER_ROLE_CHANGED",
    entity: "User",
    entityId: updated.id,
    userId: req.user?.sub,
    branchId: req.user?.branchId ?? null,
    newValue: { roleId: updated.roleId },
  });
  res.json(ok(updated, "User role updated"));
});

export const setUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const updated = await roleService.setUserStatus(String(req.params.id), Boolean(req.body.isActive), req.user?.sub);
  await logAction({
    action: updated.isActive ? "USER_ACTIVATED" : "USER_SUSPENDED",
    entity: "User",
    entityId: updated.id,
    userId: req.user?.sub,
    branchId: req.user?.branchId ?? null,
    newValue: { username: updated.username, isActive: updated.isActive },
  });
  res.json(ok(updated, updated.isActive ? "User activated" : "User suspended"));
});
