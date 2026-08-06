import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import { buildPageMeta, getPagination } from "../utils/pagination.js";

/* ------------------------------------------------------------------ */
/* Notification centre — events pushed to users (real-time-ready).     */
/* ------------------------------------------------------------------ */

export interface NotificationInput {
  userId?: string | null;
  title: string;
  message: string;
  type?: NotificationType;
  category?: string;
  branchId?: string | null;
}

/** Owner of a branch (or the first active owner) to notify for system events. */
async function resolveOwnerUserId(branchId: string | null): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: {
      isActive: true,
      ...(branchId ? { branchId } : {}),
      role: { name: "OWNER" },
    },
    select: { id: true },
  });
  return user?.id ?? null;
}

/** Best-effort notification creation — never throws into the caller's flow. */
export async function createNotification(input: NotificationInput): Promise<void> {
  try {
    const userId =
      input.userId ?? (await resolveOwnerUserId(input.branchId ?? null));
    if (!userId) return;
    await prisma.notification.create({
      data: {
        userId,
        title: input.title,
        message: input.message,
        type: input.type ?? "INFO",
        category: input.category ?? "SYSTEM",
        branchId: input.branchId ?? null,
      },
    });
  } catch {
    /* notifications are best-effort */
  }
}

export interface NotificationListQuery {
  page?: number;
  pageSize?: number;
  unreadOnly?: string;
  category?: string;
}

function serialize(n: Prisma.NotificationGetPayload<Record<string, never>>) {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    category: n.category,
    isRead: n.isRead,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function listNotifications(
  userId: string,
  query: NotificationListQuery,
  branchId: string | null,
) {
  const pagination = getPagination(query.page, query.pageSize);
  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(branchId ? { branchId } : {}),
    ...(query.unreadOnly === "true" ? { isRead: false } : {}),
    ...(query.category && query.category !== "ALL" ? { category: query.category } : {}),
  };

  const [rows, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
  ]);

  return {
    data: rows.map(serialize),
    unreadCount,
    ...buildPageMeta(total, pagination),
  };
}

export async function markNotificationRead(id: string, userId: string) {
  const notification = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notification) throw ApiError.notFound("Notification not found");
  if (notification.isRead) return serialize(notification);
  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
  return serialize(updated);
}

export async function markAllNotificationsRead(userId: string, branchId: string | null) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false, ...(branchId ? { branchId } : {}) },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function deleteNotification(id: string, userId: string) {
  const notification = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notification) throw ApiError.notFound("Notification not found");
  await prisma.notification.delete({ where: { id } });
}
