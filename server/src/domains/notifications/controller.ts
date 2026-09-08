import type { Response } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import type { AuthRequest } from "../../common/middlewares/authenticate.js";
import * as notificationService from "./service.js";
import { notificationPreferencesSchema } from "../../shared/index.js";

export const getNotifications = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));

    const result = await notificationService.listNotifications(
      req.userId!,
      page,
      pageSize
    );

    res.json({ success: true, data: result });
  }
);

export const markNotificationRead = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const notification = await notificationService.markAsRead(
      req.userId!,
      String(id)
    );

    res.json({ success: true, data: { notification } });
  }
);


export const markAllRead = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await notificationService.markAllAsRead(req.userId!);

    res.json({ success: true, data: result });
  }
);

export const getPreferences = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const preferences = await notificationService.getPreferences(req.userId!);

    res.json({ success: true, data: { preferences } });
  }
);

export const updatePreferences = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const parsed = notificationPreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid notification preferences",
        errors: parsed.error.issues.map((i) => i.message),
      });
      return;
    }

    const preferences = await notificationService.updatePreferences(
      req.userId!,
      parsed.data
    );

    res.json({ success: true, data: { preferences } });
  }
);
