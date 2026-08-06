import bcrypt from "bcryptjs";
import type { Prisma, User } from "@prisma/client";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/token.js";

type UserWithRole = Prisma.UserGetPayload<{ include: { role: true } }>;

export interface PublicUser {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

function toPublicUser(user: UserWithRole): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role.name,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

function issuePayload(user: UserWithRole) {
  return {
    sub: user.id,
    username: user.username,
    role: user.role.name,
    branchId: user.branchId,
  };
}

/** Bootstrap the very first account (Owner). Registration closes afterwards. */
export async function registerOwner(input: {
  username: string;
  email?: string;
  fullName: string;
  phone?: string;
  password: string;
}) {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    throw ApiError.forbidden("Registration is closed — contact an administrator");
  }
  const role = await prisma.role.findUnique({ where: { name: "OWNER" } });
  if (!role) {
    throw new ApiError(500, "Role OWNER has not been seeded. Run `npm run db:seed`.");
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      username: input.username.trim().toLowerCase(),
      email: input.email || null,
      fullName: input.fullName,
      phone: input.phone || null,
      passwordHash,
      roleId: role.id,
    },
    include: { role: true },
  });
  return toPublicUser(user);
}

// Constant-time guard: comparing against a dummy hash when the user is missing
// prevents user enumeration through response timing.
const DUMMY_HASH = bcrypt.hashSync("mig-flares-dummy-password", 12);

export async function login(username: string, password: string) {
  // Usernames are stored lowercase (createUser/registerOwner normalize) —
  // normalize here too so case-insensitive logins work.
  const user = await prisma.user.findUnique({
    where: { username: username.trim().toLowerCase() },
    include: { role: true },
  });
  if (!user || !user.isActive) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw ApiError.unauthorized("Invalid credentials");
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Invalid credentials");
  }
  const refreshToken = signRefreshToken(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken, lastLoginAt: new Date() },
  });
  return {
    user: toPublicUser(user),
    accessToken: signAccessToken(issuePayload(user)),
    refreshToken,
  };
}

export async function refreshTokens(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { role: true },
  });
  if (!user || !user.isActive || user.refreshToken !== refreshToken) {
    throw ApiError.unauthorized("Invalid refresh token");
  }
  const nextRefresh = signRefreshToken(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: nextRefresh } });
  return {
    user: toPublicUser(user),
    accessToken: signAccessToken(issuePayload(user)),
    refreshToken: nextRefresh,
  };
}

export async function logout(userId: string): Promise<void> {
  await prisma.user
    .update({ where: { id: userId }, data: { refreshToken: null } })
    .catch(() => undefined);
}

export interface ProfileUpdateInput {
  fullName?: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export async function updateProfile(userId: string, input: ProfileUpdateInput): Promise<PublicUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.fullName !== undefined && { fullName: input.fullName }),
      ...(input.phone !== undefined && { phone: input.phone || null }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl || null }),
    },
    include: { role: true },
  });
  return toPublicUser(user);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("User not found");
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest("Current password is incorrect");
  if (newPassword.length < 6) {
    throw ApiError.badRequest("New password must be at least 6 characters");
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash, refreshToken: null } });
}

/** Recent logins, derived from the audit trail. */
export async function recentLogins(
  userId: string,
): Promise<{ total: number; data: { createdAt: string; ipAddress: string | null }[] }> {
  // Login history is day-scoped: it starts tracking every sign-in at local
  // midnight and resets (only today's entries are returned) at the next one.
  const startOfDay = startOfTodayInZone(env.appTimezone);
  const where: Prisma.AuditLogWhereInput = {
    userId,
    action: "LOGIN",
    createdAt: { gte: startOfDay },
  };
  const [rows, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, ipAddress: true },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return {
    total,
    data: rows.map((r) => ({ createdAt: r.createdAt.toISOString(), ipAddress: r.ipAddress })),
  };
}

/**
 * UTC instant of local midnight (start of today) in a given IANA timezone.
 * Exact for fixed-offset zones (Africa/Lusaka has no DST); the offset is
 * measured at "now", which is stable across the day for fixed-offset zones.
 */
function startOfTodayInZone(timeZone: string, now = new Date()): Date {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const localAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const offsetMs = localAsUtc - now.getTime();
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")) - offsetMs);
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user) throw ApiError.notFound("User not found");
  return toPublicUser(user);
}

export type { User };
