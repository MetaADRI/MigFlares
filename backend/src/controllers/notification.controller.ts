import type { Request, Response } from "express";
import { ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as notificationService from "../services/notification.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationService.listNotifications(
    req.user!.sub,
    req.query as unknown as notificationService.NotificationListQuery,
    req.user?.branchId ?? null,
  );
  res.json(ok(result));
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.markNotificationRead(String(req.params.id), req.user!.sub);
  res.json(ok(notification));
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAllNotificationsRead(req.user!.sub, req.user?.branchId ?? null);
  res.json(ok(null, "All notifications marked as read"));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.deleteNotification(String(req.params.id), req.user!.sub);
  res.json(ok(null, "Notification deleted"));
});
