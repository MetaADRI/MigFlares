import bcrypt from "bcryptjs";
import type { Prisma, RoleName } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";

/* ------------------------------------------------------------------ */
/* Enterprise RBAC — roles, permissions and user assignment.           */
/* ------------------------------------------------------------------ */

const roleInclude = {
  _count: { select: { users: true } },
  rolePermissions: { include: { permission: { select: { key: true, module: true } } } },
} satisfies Prisma.RoleInclude;

function serialize(role: Prisma.RoleGetPayload<{ include: typeof roleInclude }>) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isActive: role.isActive,
    userCount: role._count.users,
    permissions: role.rolePermissions.map((rp) => rp.permission.key),
  };
}

export async function listRoles() {
  const roles = await prisma.role.findMany({ include: roleInclude, orderBy: { name: "asc" } });
  return roles.map(serialize);
}

export async function listPermissions() {
  const rows = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { name: "asc" }] });
  return rows.map((p) => ({
    id: p.id,
    key: p.key,
    module: p.module,
    name: p.name,
    description: p.description,
  }));
}

export interface RoleInput {
  name?: RoleName;
  description?: string | null;
  isActive?: boolean;
  permissionKeys?: string[];
}

async function replacePermissions(roleId: string, keys: string[]): Promise<void> {
  const permissions = await prisma.permission.findMany({ where: { key: { in: keys } } });
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    ...permissions.map((p) =>
      prisma.rolePermission.create({
        data: { roleId, permissionId: p.id },
      }),
    ),
  ]);
}

export async function createRole(input: RoleInput) {
  if (!input.name) throw ApiError.badRequest("Role name is required");
  const existing = await prisma.role.findUnique({ where: { name: input.name } });
  if (existing) {
    throw ApiError.badRequest(`A role named ${input.name} already exists`);
  }
  const role = await prisma.role.create({
    data: {
      name: input.name!,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
    },
  });
  await replacePermissions(role.id, input.permissionKeys ?? []);
  return getRole(role.id);
}

export async function getRole(id: string) {
  const role = await prisma.role.findUnique({ where: { id }, include: roleInclude });
  if (!role) throw ApiError.notFound("Role not found");
  return serialize(role);
}

export async function updateRole(id: string, input: RoleInput) {
  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Role not found");
  const role = await prisma.role.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
  if (input.permissionKeys !== undefined) {
    await replacePermissions(id, input.permissionKeys);
  }
  return getRole(role.id);
}

export async function toggleRole(id: string, isActive: boolean) {
  await prisma.role
    .update({ where: { id }, data: { isActive } })
    .catch(() => {
      throw ApiError.notFound("Role not found");
    });
  return getRole(id);
}

/** Users available for role assignment. */
export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      role: { select: { id: true, name: true } },
    },
  });
  return users.map((u) => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    roleId: u.role.id,
    roleName: u.role.name,
  }));
}

export async function setUserRole(userId: string, roleId: string) {
  const user = await prisma.user
    .update({ where: { id: userId }, data: { roleId } })
    .catch(() => {
      throw ApiError.notFound("User not found");
    });
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    roleId: user.roleId,
  };
}

export interface UserInput {
  username: string;
  email?: string | null;
  fullName: string;
  phone?: string | null;
  password: string;
  roleId: string;
  isActive?: boolean;
}

export interface UserUpdateInput {
  email?: string | null;
  fullName?: string;
  phone?: string | null;
  isActive?: boolean;
  roleId?: string;
  password?: string;
}

const userSelect = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  phone: true,
  isActive: true,
  lastLoginAt: true,
  role: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

async function assertRoleExists(roleId: string): Promise<void> {
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true } });
  if (!role) throw ApiError.badRequest("Role not found");
}

/**
 * Lockout guard: you can't deactivate your own account, and you can't
 * deactivate the last active OWNER — otherwise the business locks itself out.
 */
async function assertCanDeactivate(userId: string, actorId?: string): Promise<void> {
  if (actorId && userId === actorId) {
    throw ApiError.forbidden("You cannot deactivate your own account");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: { select: { name: true } } },
  });
  if (!user) throw ApiError.notFound("User not found");
  if (user.role.name === "OWNER") {
    const activeOwners = await prisma.user.count({
      where: { role: { name: "OWNER" }, isActive: true },
    });
    if (activeOwners <= 1) {
      throw ApiError.forbidden("Cannot deactivate the last active owner");
    }
  }
}

function serializeUser(u: Prisma.UserGetPayload<{ select: typeof userSelect }>) {
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    roleId: u.role.id,
    roleName: u.role.name,
  };
}

/** Create a staff account with a chosen role (admins can provision other admins). */
export async function createUser(input: UserInput) {
  const username = input.username.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw ApiError.badRequest("Username is already taken");
  if (input.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: input.email } });
    if (emailTaken) throw ApiError.badRequest("Email is already in use");
  }
  await assertRoleExists(input.roleId);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      username,
      email: input.email || null,
      fullName: input.fullName,
      phone: input.phone || null,
      passwordHash,
      roleId: input.roleId,
      isActive: input.isActive ?? true,
    },
    select: userSelect,
  });
  return serializeUser(user);
}

export async function updateUser(userId: string, input: UserUpdateInput, actorId?: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw ApiError.notFound("User not found");
  if (input.roleId !== undefined) await assertRoleExists(input.roleId);
  if (input.isActive === false) await assertCanDeactivate(userId, actorId);
  if (input.email !== undefined && input.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: input.email } });
    if (emailTaken && emailTaken.id !== userId) throw ApiError.badRequest("Email is already in use");
  }
  const data: Prisma.UserUpdateInput = {
    ...(input.email !== undefined && { email: input.email || null }),
    ...(input.fullName !== undefined && { fullName: input.fullName }),
    ...(input.phone !== undefined && { phone: input.phone || null }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
    ...(input.roleId !== undefined && { roleId: input.roleId }),
    ...(input.password !== undefined && { passwordHash: await bcrypt.hash(input.password, 12) }),
  };
  const user = await prisma.user.update({ where: { id: userId }, data, select: userSelect });
  return serializeUser(user);
}

export async function setUserStatus(userId: string, isActive: boolean, actorId?: string) {
  if (!isActive) await assertCanDeactivate(userId, actorId);
  const user = await prisma.user
    .update({ where: { id: userId }, data: { isActive }, select: userSelect })
    .catch(() => {
      throw ApiError.notFound("User not found");
    });
  return serializeUser(user);
}
